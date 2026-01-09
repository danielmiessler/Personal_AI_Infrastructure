/**
 * Job Scheduler
 *
 * Simple cron-like scheduling for JAI automation tasks.
 */

import type { ScheduledJob, ParsedSchedule, SchedulePattern } from './types';

// =============================================================================
// Constants
// =============================================================================

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

// =============================================================================
// Job Scheduler Class
// =============================================================================

/**
 * Simple job scheduler supporting daily, weekly, hourly, and interval schedules.
 *
 * Schedule patterns:
 * - 'daily:0800' - Run daily at 8:00 AM
 * - 'daily:1630' - Run daily at 4:30 PM
 * - 'weekly:MON:0800' - Run weekly on Monday at 8:00 AM
 * - 'hourly' - Run every hour on the hour
 * - 'interval:300000' - Run every 5 minutes
 *
 * @example
 * ```ts
 * const scheduler = new JobScheduler();
 *
 * scheduler.schedule({
 *   id: 'morning-brief',
 *   name: 'Morning Brief',
 *   schedule: 'daily:0800',
 *   handler: async () => {
 *     const brief = await generateMorningBrief(config, provider, portfolio);
 *     await sendBrief(brief);
 *   },
 * });
 *
 * scheduler.start();
 * ```
 */
export class JobScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isRunning = false;
  private checkIntervalId?: ReturnType<typeof setInterval>;

  constructor() {}

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Schedule a new job.
   */
  schedule(job: ScheduledJob): void {
    // Validate the schedule pattern
    const parsed = this.parseSchedule(job.schedule);
    if (!parsed) {
      throw new Error(`Invalid schedule pattern: ${job.schedule}`);
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(parsed);
    const jobWithNext: ScheduledJob = {
      ...job,
      nextRun: nextRun.toISOString(),
      enabled: job.enabled ?? true,
    };

    this.jobs.set(job.id, jobWithNext);

    // If scheduler is running, set up the timer
    if (this.isRunning && jobWithNext.enabled) {
      this.scheduleTimer(jobWithNext);
    }
  }

  /**
   * Remove a job from the scheduler.
   */
  unschedule(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }
    this.jobs.delete(jobId);
  }

  /**
   * Start the scheduler.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleTimer(job);
      }
    }

    // Check for jobs every minute (for hourly schedules and drift correction)
    this.checkIntervalId = setInterval(() => {
      this.checkSchedules();
    }, MS_PER_MINUTE);
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    this.isRunning = false;

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }
  }

  /**
   * List all scheduled jobs.
   */
  listJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job.
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Enable a job.
   */
  enableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      if (this.isRunning) {
        this.scheduleTimer(job);
      }
    }
  }

  /**
   * Disable a job.
   */
  disableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      const timer = this.timers.get(jobId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(jobId);
      }
    }
  }

  /**
   * Manually trigger a job.
   */
  async triggerJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await this.runJob(job);
  }

  /**
   * Get scheduler status.
   */
  getStatus(): { isRunning: boolean; jobCount: number; nextJobs: Array<{ id: string; name: string; nextRun?: string }> } {
    const nextJobs = Array.from(this.jobs.values())
      .filter(j => j.enabled)
      .sort((a, b) => {
        if (!a.nextRun) return 1;
        if (!b.nextRun) return -1;
        return new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime();
      })
      .slice(0, 5)
      .map(j => ({ id: j.id, name: j.name, nextRun: j.nextRun }));

    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      nextJobs,
    };
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private parseSchedule(schedule: SchedulePattern): ParsedSchedule | null {
    // 'daily:HHMM'
    const dailyMatch = schedule.match(/^daily:(\d{2})(\d{2})$/);
    if (dailyMatch) {
      const hour = parseInt(dailyMatch[1], 10);
      const minute = parseInt(dailyMatch[2], 10);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { type: 'daily', hour, minute };
      }
      return null;
    }

    // 'weekly:DAY:HHMM'
    const weeklyMatch = schedule.match(/^weekly:([A-Z]{3}):(\d{2})(\d{2})$/);
    if (weeklyMatch) {
      const dayOfWeek = DAY_NAMES.indexOf(weeklyMatch[1]);
      const hour = parseInt(weeklyMatch[2], 10);
      const minute = parseInt(weeklyMatch[3], 10);
      if (dayOfWeek !== -1 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { type: 'weekly', dayOfWeek, hour, minute };
      }
      return null;
    }

    // 'hourly'
    if (schedule === 'hourly') {
      return { type: 'hourly', minute: 0 };
    }

    // 'interval:MS'
    const intervalMatch = schedule.match(/^interval:(\d+)$/);
    if (intervalMatch) {
      const intervalMs = parseInt(intervalMatch[1], 10);
      if (intervalMs > 0) {
        return { type: 'interval', intervalMs };
      }
      return null;
    }

    return null;
  }

  private calculateNextRun(parsed: ParsedSchedule, from: Date = new Date()): Date {
    const now = from;

    switch (parsed.type) {
      case 'daily': {
        const next = new Date(now);
        next.setHours(parsed.hour!, parsed.minute!, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }

      case 'weekly': {
        const next = new Date(now);
        next.setHours(parsed.hour!, parsed.minute!, 0, 0);

        // Find next occurrence of the day
        const daysUntil = (parsed.dayOfWeek! - now.getDay() + 7) % 7;
        if (daysUntil === 0 && next <= now) {
          next.setDate(next.getDate() + 7);
        } else {
          next.setDate(next.getDate() + daysUntil);
        }
        return next;
      }

      case 'hourly': {
        const next = new Date(now);
        next.setMinutes(parsed.minute!, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
        return next;
      }

      case 'interval': {
        return new Date(now.getTime() + parsed.intervalMs!);
      }

      default:
        return new Date(now.getTime() + MS_PER_HOUR);
    }
  }

  private scheduleTimer(job: ScheduledJob): void {
    // Clear existing timer
    const existingTimer = this.timers.get(job.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const parsed = this.parseSchedule(job.schedule);
    if (!parsed) return;

    const nextRun = job.nextRun ? new Date(job.nextRun) : this.calculateNextRun(parsed);
    const delay = Math.max(0, nextRun.getTime() - Date.now());

    const timer = setTimeout(async () => {
      await this.runJob(job);
    }, delay);

    this.timers.set(job.id, timer);
  }

  private async runJob(job: ScheduledJob): Promise<void> {
    console.log(`[Scheduler] Running job: ${job.name}`);

    try {
      await job.handler();
      job.lastRun = new Date().toISOString();
    } catch (error) {
      console.error(`[Scheduler] Error running job ${job.name}:`, error);
    }

    // Calculate and schedule next run
    const parsed = this.parseSchedule(job.schedule);
    if (parsed) {
      job.nextRun = this.calculateNextRun(parsed).toISOString();
      if (this.isRunning && job.enabled) {
        this.scheduleTimer(job);
      }
    }
  }

  private checkSchedules(): void {
    const now = Date.now();

    for (const job of this.jobs.values()) {
      if (!job.enabled || !job.nextRun) continue;

      const nextRunTime = new Date(job.nextRun).getTime();

      // If we missed a job (within 2 minutes), run it now
      if (nextRunTime <= now && nextRunTime > now - 2 * MS_PER_MINUTE) {
        // Only if not already scheduled
        if (!this.timers.has(job.id)) {
          this.runJob(job);
        }
      }
    }
  }
}

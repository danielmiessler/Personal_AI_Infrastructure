/**
 * Orchestration Module - Event Queue
 *
 * Priority-based event queue for managing trading events like
 * stop losses, price targets, and buy signals.
 */

import type { QueuedEvent, EventType, EventPriority, EventData } from './types';
import { PRIORITY_SCORES, DEFAULT_EVENT_PRIORITY } from './types';

// ============================================================================
// Event Queue
// ============================================================================

/**
 * Priority-based queue for managing trading events.
 *
 * Events are sorted by priority, with higher priority events
 * processed first. Within the same priority, events are ordered
 * by creation time (FIFO).
 */
export class EventQueue {
  private events: QueuedEvent[] = [];
  private eventIdCounter = 0;

  /**
   * Add an event to the queue.
   *
   * @param event - Event to add (id will be generated if not provided)
   */
  enqueue(event: QueuedEvent): void {
    // Generate ID if not provided
    const eventWithId: QueuedEvent = {
      ...event,
      id: event.id ?? this.generateId(),
    };

    this.events.push(eventWithId);
    this.prioritize();
  }

  /**
   * Create and enqueue an event from parameters.
   *
   * @param type - Event type
   * @param ticker - Stock ticker symbol
   * @param data - Event data
   * @param priority - Priority (optional, uses default for type)
   * @returns The created event
   */
  create(
    type: EventType,
    ticker: string,
    data: EventData,
    priority?: EventPriority
  ): QueuedEvent {
    const event: QueuedEvent = {
      type,
      ticker,
      data,
      priority: priority ?? DEFAULT_EVENT_PRIORITY[type],
      createdAt: new Date().toISOString(),
      id: this.generateId(),
    };

    this.events.push(event);
    this.prioritize();

    return event;
  }

  /**
   * Remove and return the highest priority event.
   *
   * @returns The highest priority event, or undefined if queue is empty
   */
  dequeue(): QueuedEvent | undefined {
    return this.events.shift();
  }

  /**
   * Peek at the highest priority event without removing it.
   *
   * @returns The highest priority event, or undefined if queue is empty
   */
  peek(): QueuedEvent | undefined {
    return this.events[0];
  }

  /**
   * Get all events of a specific type.
   *
   * @param type - Event type to filter by
   * @returns Array of matching events (not removed from queue)
   */
  getByType(type: EventType): QueuedEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get all events for a specific ticker.
   *
   * @param ticker - Stock ticker symbol
   * @returns Array of matching events (not removed from queue)
   */
  getByTicker(ticker: string): QueuedEvent[] {
    return this.events.filter(
      (e) => e.ticker.toLowerCase() === ticker.toLowerCase()
    );
  }

  /**
   * Get events by priority level.
   *
   * @param priority - Priority level to filter by
   * @returns Array of matching events
   */
  getByPriority(priority: EventPriority): QueuedEvent[] {
    return this.events.filter((e) => e.priority === priority);
  }

  /**
   * Remove a specific event by ID.
   *
   * @param id - Event ID to remove
   * @returns True if event was found and removed
   */
  remove(id: string): boolean {
    const index = this.events.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.events.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove all events for a specific ticker.
   *
   * @param ticker - Stock ticker symbol
   * @returns Number of events removed
   */
  removeByTicker(ticker: string): number {
    const lowerTicker = ticker.toLowerCase();
    const before = this.events.length;
    this.events = this.events.filter(
      (e) => e.ticker.toLowerCase() !== lowerTicker
    );
    return before - this.events.length;
  }

  /**
   * Sort events by priority and creation time.
   */
  prioritize(): void {
    this.events.sort((a, b) => {
      // First by priority (higher score first)
      const priorityDiff = PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by creation time (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Clear all events from the queue.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get the number of events in the queue.
   */
  get length(): number {
    return this.events.length;
  }

  /**
   * Check if the queue is empty.
   */
  get isEmpty(): boolean {
    return this.events.length === 0;
  }

  /**
   * Get all events (for iteration/inspection).
   *
   * @returns Copy of all events in priority order
   */
  all(): QueuedEvent[] {
    return [...this.events];
  }

  /**
   * Get summary statistics about the queue.
   */
  stats(): QueueStats {
    const byType: Record<EventType, number> = {
      STOP_LOSS: 0,
      PRICE_TARGET: 0,
      BUY_SIGNAL: 0,
      ALERT: 0,
    };

    const byPriority: Record<EventPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    };

    for (const event of this.events) {
      byType[event.type]++;
      byPriority[event.priority]++;
    }

    return {
      total: this.events.length,
      byType,
      byPriority,
      oldestEvent: this.events[this.events.length - 1]?.createdAt,
      newestEvent: this.events[0]?.createdAt,
    };
  }

  /**
   * Serialize queue to JSON for persistence.
   */
  toJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Load queue from JSON.
   *
   * @param json - JSON string from toJSON()
   */
  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this.events = parsed;
        this.prioritize();
      }
    } catch {
      throw new Error('Invalid JSON format for event queue');
    }
  }

  /**
   * Generate a unique event ID.
   */
  private generateId(): string {
    this.eventIdCounter++;
    return `evt_${Date.now()}_${this.eventIdCounter}`;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Statistics about the event queue.
 */
export interface QueueStats {
  /** Total number of events */
  total: number;
  /** Count by event type */
  byType: Record<EventType, number>;
  /** Count by priority */
  byPriority: Record<EventPriority, number>;
  /** Oldest event timestamp */
  oldestEvent?: string;
  /** Newest event timestamp */
  newestEvent?: string;
}

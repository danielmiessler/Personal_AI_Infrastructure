/**
 * Automation Module
 *
 * Market monitoring, job scheduling, and morning brief generation.
 */

// Types
export type {
  MonitorConfig,
  MonitorAlert,
  MonitorAlertType,
  MonitorAlertData,
  ScheduledJob,
  SchedulePattern,
  ParsedSchedule,
  MorningBriefConfig,
  MorningBrief,
  BriefPosition,
  BriefAlert,
  BriefOpportunity,
  MarketOverview,
  AlertNotifier,
  AutomationDataProvider,
} from './types';

// Classes
export { MarketMonitor } from './monitor';
export { JobScheduler } from './scheduler';

// Functions
export { generateMorningBrief, formatBriefForConsole } from './brief';

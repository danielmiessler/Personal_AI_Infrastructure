// Working Memory System - Shared Types
// All interfaces match the SQLite schema defined in schema.sql

// --- JSONL Entry Format ---

export interface CaptureEntry {
  timestamp: string; // ISO8601
  session_id: string;
  message_role: string;
  tool_name: string;
  tool_input_summary: string;
  tool_output_summary: string;
  topics_extracted: string[];
  decisions_made: string[];
  reasoning_chain: string;
  type?: "entry" | "session_summary";
}

// --- Session Summary ---

export interface SessionSummary {
  topics_covered: TopicFrequency[];
  decisions_made: DecisionSummary[];
  action_items: ActionItem[];
  unresolved_questions: string[];
  key_files_touched: string[];
  duration: number; // seconds
  entry_count: number;
}

export interface TopicFrequency {
  name: string;
  frequency: number;
}

export interface DecisionSummary {
  text: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

export interface ActionItem {
  text: string;
  status: "open" | "completed" | "deferred";
}

// --- Search & Query Results ---

export interface SearchResult {
  entry_id: number;
  session_id: string;
  timestamp: string;
  tool_name: string;
  matched_text: string;
  rank: number;
}

export interface DecisionRecord {
  id: number;
  session_id: string;
  entry_id: number;
  decision_text: string;
  reasoning_context: string;
  confidence: string;
  timestamp: string;
}

export interface TopicRecord {
  id: number;
  name: string;
  first_seen: string;
  last_seen: string;
  session_count: number;
  entry_count: number;
}

// --- DB Row Types (match SQLite schema exactly) ---

export interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  summary: string | null;
  topics_json: string | null;
  decisions_json: string | null;
  action_items_json: string | null;
  unresolved_json: string | null;
  entry_count: number;
}

export interface EntryRow {
  id: number;
  session_id: string;
  timestamp: string;
  message_role: string;
  tool_name: string;
  tool_input_summary: string;
  tool_output_summary: string;
  topics_json: string;
  decisions_json: string;
  reasoning_chain: string;
  raw_jsonl_offset: number | null;
}

export interface TopicRow {
  id: number;
  name: string;
  first_seen: string;
  last_seen: string;
  session_count: number;
  entry_count: number;
}

export interface DecisionRow {
  id: number;
  session_id: string;
  entry_id: number;
  decision_text: string;
  reasoning_context: string;
  confidence: string;
  timestamp: string;
}

export interface TopicEntryRow {
  topic_id: number;
  entry_id: number;
}

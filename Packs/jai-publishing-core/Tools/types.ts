/**
 * JAI Publishing Core - Shared Types
 */

// ============================================================================
// Keyword Queue Types
// ============================================================================

export interface KeywordEntry {
  id: string;                    // kw-YYYY-MM-DD-NNN
  keywords: string[];            // Primary + secondary keywords
  topic: string;                 // Article topic description
  priority: number;              // 1 = highest
  status: KeywordStatus;
  added: string;                 // ISO date
  source: KeywordSource;
  seasonal?: SeasonalInfo;
  metrics?: KeywordMetrics;
}

export type KeywordStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type KeywordSource = 'manual' | 'discovery_pipeline' | 'google_trends' | 'autocomplete' | 'llm';

export interface SeasonalInfo {
  event: string;
  eventDate: string;
  publishDeadline: string;
}

export interface KeywordMetrics {
  searchVolume?: number;
  competition?: 'low' | 'medium' | 'high';
  trendDirection?: 'rising' | 'stable' | 'falling';
}

export interface KeywordScore {
  trendScore: number;        // 0-100 from Google Trends
  competitionScore: number;  // 0-100 (inverse - lower competition = higher)
  commercialIntent: number;  // 0-100 (product keywords score higher)
  seasonalBonus: number;     // 0-50 (upcoming seasonal relevance)
  recencyPenalty: number;    // 0-50 (similar recent article = penalty)
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarEntry {
  id: string;
  title: string;
  keywordId?: string;            // Link to keyword queue
  scheduledDate: string;         // ISO date
  status: CalendarStatus;
  articlePath?: string;          // Path to generated article
  site: string;                  // Site identifier
}

export type CalendarStatus = 'draft' | 'scheduled' | 'published' | 'failed';

// ============================================================================
// Amazon Product Types
// ============================================================================

export interface AmazonProduct {
  asin: string;
  title: string;
  price: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  variantImages?: string[];
  features?: string[];
  category?: string;
  available: boolean;
  lastChecked?: string;          // ISO timestamp
}

export interface ProductSearchParams {
  keywords: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  limit?: number;
}

// ============================================================================
// SEO Types
// ============================================================================

export interface SeoAnalysis {
  score: number;                 // 0-100
  issues: SeoIssue[];
  passed: boolean;
}

export interface SeoIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  location?: string;
}

// ============================================================================
// Site Configuration
// ============================================================================

export interface SiteConfig {
  id: string;                    // e.g., 'pispy', 'pg101'
  name: string;                  // e.g., 'pispycameras.com'
  platform: 'astro' | 'wordpress';
  deployment: 'cloudflare-pages' | 'wordpress';
  repo: string;                  // GitLab/GitHub repo
  localPath: string;             // Local clone path
  affiliateTag: string;          // Amazon affiliate tag
  legalRequirements: string[];   // Required disclaimer sections
}

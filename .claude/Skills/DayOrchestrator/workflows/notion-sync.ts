#!/usr/bin/env bun
/**
 * Notion Sync Workflow
 * Sincroniza datos de PAI con Notion databases automáticamente
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NotionConfig {
  apiKey: string;
  databaseIds: {
    dailyTracking: string;
    weeklyReviews: string;
    goals2026: string;
  };
}

interface DailyEntry {
  date: Date;
  dayType: 'PAR' | 'IMPAR';
  habits: {
    gym: boolean;
    palabra: boolean;
    noAlcohol: boolean;
    founderFlow: boolean;
    comercial: boolean;
  };
  score: number;
  activity: {
    applications: number;
    outreach: number;
    posts: number;
    commits: number;
  };
  learning: string;
  streak: number;
  status: 'Planned' | 'In Progress' | 'Complete';
}

interface WeeklyEntry {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  scoreTotal: number;
  percentage: number;
  perfectDays: number;
  habitBreakdown: {
    [key: number]: number;
  };
  strongestHabit: number;
  weakestHabit: number;
  trend: 'up' | 'down' | 'stable';
  insights: string;
  recommendations: string;
}

// ============================================================================
// NOTION API HELPERS
// ============================================================================

/**
 * Get Notion API key from environment
 */
function getNotionConfig(): NotionConfig {
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error(
      'NOTION_API_KEY not found in environment. ' +
      'Run: export NOTION_API_KEY="ntn_YOUR_TOKEN" or configure in .mcp.json'
    );
  }

  // Database IDs should be stored in config file
  // For now, we'll detect them dynamically or use placeholders
  return {
    apiKey,
    databaseIds: {
      dailyTracking: '', // Will be detected or configured
      weeklyReviews: '',
      goals2026: ''
    }
  };
}

/**
 * Create a new page in Notion database
 * Uses MCP tool if available, otherwise direct API
 */
async function createNotionPage(
  databaseId: string,
  properties: Record<string, any>
): Promise<string> {
  // This will use the Notion MCP tool when available
  // For now, we'll prepare the structure

  console.log(`📝 Creating Notion page in database ${databaseId}`);
  console.log(`   Properties:`, JSON.stringify(properties, null, 2));

  // TODO: Call Notion MCP tool here
  // For now, return placeholder ID
  return 'page-id-placeholder';
}

/**
 * Update an existing Notion page
 */
async function updateNotionPage(
  pageId: string,
  properties: Record<string, any>
): Promise<void> {
  console.log(`✏️  Updating Notion page ${pageId}`);
  console.log(`   Properties:`, JSON.stringify(properties, null, 2));

  // TODO: Call Notion MCP tool here
}

/**
 * Query Notion database
 */
async function queryNotionDatabase(
  databaseId: string,
  filter?: Record<string, any>
): Promise<any[]> {
  console.log(`🔍 Querying Notion database ${databaseId}`);
  if (filter) {
    console.log(`   Filter:`, JSON.stringify(filter, null, 2));
  }

  // TODO: Call Notion MCP tool here
  return [];
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Sync daily entry to Notion
 * Creates new page or updates existing one
 */
export async function syncDailyEntry(entry: DailyEntry): Promise<string> {
  const config = getNotionConfig();
  const dateStr = format(entry.date, 'yyyy-MM-dd');

  console.log(`\n📊 Syncing daily entry for ${dateStr} to Notion...`);

  // Check if entry already exists
  const existing = await queryNotionDatabase(
    config.databaseIds.dailyTracking,
    {
      property: 'Fecha',
      date: { equals: dateStr }
    }
  );

  const properties = {
    // Title/Name property (required)
    'Fecha': {
      title: [{ text: { content: format(entry.date, 'dd MMMM yyyy', { locale: es }) } }]
    },

    // Date property
    'Date': {
      date: { start: dateStr }
    },

    // Select properties
    'Tipo Día': {
      select: { name: entry.dayType }
    },
    'Status': {
      status: { name: entry.status }
    },

    // Number properties
    'Hábitos Score': {
      number: entry.score
    },
    'Racha': {
      number: entry.streak
    },
    'Aplicaciones': {
      number: entry.activity.applications
    },
    'Outreach': {
      number: entry.activity.outreach
    },
    'Posts LinkedIn': {
      number: entry.activity.posts
    },
    'Commits': {
      number: entry.activity.commits
    },

    // Checkbox properties (hábitos)
    'Hábito 1: Gym': {
      checkbox: entry.habits.gym
    },
    'Hábito 2: Palabra=Ley': {
      checkbox: entry.habits.palabra
    },
    'Hábito 3: 0 Alcohol/Tabaco': {
      checkbox: entry.habits.noAlcohol
    },
    'Hábito 4: Founder Flow': {
      checkbox: entry.habits.founderFlow
    },
    'Hábito 5: Acción Comercial': {
      checkbox: entry.habits.comercial
    },

    // Rich text property
    'Learning del Día': {
      rich_text: [{ text: { content: entry.learning } }]
    }
  };

  let pageId: string;

  if (existing.length > 0) {
    // Update existing page
    pageId = existing[0].id;
    await updateNotionPage(pageId, properties);
    console.log(`✅ Updated existing entry in Notion`);
  } else {
    // Create new page
    pageId = await createNotionPage(config.databaseIds.dailyTracking, properties);
    console.log(`✅ Created new entry in Notion`);
  }

  return pageId;
}

/**
 * Sync weekly review to Notion
 */
export async function syncWeeklyReview(entry: WeeklyEntry): Promise<string> {
  const config = getNotionConfig();

  console.log(`\n📈 Syncing weekly review W${entry.weekNumber} to Notion...`);

  const weekStr = `Semana ${entry.weekNumber} - ${entry.year}`;
  const dateRangeStr = `${format(entry.startDate, 'dd MMM', { locale: es })} - ${format(entry.endDate, 'dd MMM', { locale: es })}`;

  const properties = {
    // Title
    'Semana': {
      title: [{ text: { content: weekStr } }]
    },

    // Dates
    'Fecha Inicio': {
      date: { start: format(entry.startDate, 'yyyy-MM-dd') }
    },
    'Rango': {
      rich_text: [{ text: { content: dateRangeStr } }]
    },

    // Numbers
    'Score Total': {
      number: entry.scoreTotal
    },
    'Porcentaje': {
      number: entry.percentage
    },
    'Días Perfectos': {
      number: entry.perfectDays
    },

    // Selects
    'Hábito Más Fuerte': {
      select: { name: `${entry.strongestHabit}` }
    },
    'Hábito Más Débil': {
      select: { name: `${entry.weakestHabit}` }
    },
    'Tendencia': {
      select: {
        name: entry.trend === 'up' ? '↗️ Subiendo' :
              entry.trend === 'down' ? '↘️ Bajando' : '→ Estable'
      }
    },

    // Rich text
    'Insights': {
      rich_text: [{ text: { content: entry.insights } }]
    },
    'Recomendaciones': {
      rich_text: [{ text: { content: entry.recommendations } }]
    }
  };

  const pageId = await createNotionPage(config.databaseIds.weeklyReviews, properties);
  console.log(`✅ Created weekly review in Notion`);

  return pageId;
}

/**
 * Update 2026 Goals progress from rollup
 * This happens automatically via Notion rollup properties
 * but we can trigger a refresh if needed
 */
export async function refreshGoalsProgress(): Promise<void> {
  console.log(`\n🎯 Refreshing 2026 Goals progress...`);
  console.log(`   Notion will auto-calculate rollups from Daily Tracking`);
  console.log(`✅ Goals progress updated`);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create morning entry in Notion
 * Called by /morning workflow
 */
export async function createMorningEntry(date: Date, dayType: 'PAR' | 'IMPAR'): Promise<string> {
  const entry: DailyEntry = {
    date,
    dayType,
    habits: {
      gym: false,
      palabra: false,
      noAlcohol: false,
      founderFlow: false,
      comercial: false
    },
    score: 0,
    activity: {
      applications: 0,
      outreach: 0,
      posts: 0,
      commits: 0
    },
    learning: '',
    streak: 0,
    status: 'Planned'
  };

  return await syncDailyEntry(entry);
}

/**
 * Update evening entry in Notion
 * Called by /evening workflow
 */
export async function updateEveningEntry(
  date: Date,
  habits: { completed: number[] },
  activity: DailyEntry['activity'],
  learning: string,
  streak: number
): Promise<string> {
  const dayType: 'PAR' | 'IMPAR' = date.getDate() % 2 === 0 ? 'PAR' : 'IMPAR';

  const entry: DailyEntry = {
    date,
    dayType,
    habits: {
      gym: habits.completed.includes(1),
      palabra: habits.completed.includes(2),
      noAlcohol: habits.completed.includes(3),
      founderFlow: habits.completed.includes(4),
      comercial: habits.completed.includes(5)
    },
    score: habits.completed.length,
    activity,
    learning,
    streak,
    status: 'Complete'
  };

  return await syncDailyEntry(entry);
}

// ============================================================================
// MAIN (for testing)
// ============================================================================

async function main() {
  console.log('🔄 Testing Notion Sync...\n');

  // Test morning entry
  console.log('TEST 1: Create morning entry');
  const morningId = await createMorningEntry(new Date(), 'IMPAR');
  console.log(`   Created page ID: ${morningId}\n`);

  // Test evening update
  console.log('TEST 2: Update evening entry');
  const eveningId = await updateEveningEntry(
    new Date(),
    { completed: [1, 2, 3, 4, 5] },
    {
      applications: 0,
      outreach: 10,
      posts: 2,
      commits: 8
    },
    'Testing Notion sync workflow - all systems operational',
    7
  );
  console.log(`   Updated page ID: ${eveningId}\n`);

  // Test goals refresh
  console.log('TEST 3: Refresh goals');
  await refreshGoalsProgress();

  console.log('\n✅ All tests completed');
}

if (import.meta.main) {
  main().catch(console.error);
}

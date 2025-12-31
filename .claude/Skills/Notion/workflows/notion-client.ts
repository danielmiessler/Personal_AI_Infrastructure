#!/usr/bin/env bun
/**
 * Notion Direct API Client
 * Cliente directo para leer/escribir en Notion sin MCP
 */

const API_KEY = process.env.NOTION_API_KEY;
const API_VERSION = '2022-06-28';
const API_BASE = 'https://api.notion.com/v1';

if (!API_KEY) {
  console.error('❌ NOTION_API_KEY no encontrada');
  console.error('   Ejecuta: export NOTION_API_KEY="ntn_YOUR_TOKEN"');
  process.exit(1);
}

// Config guardada después del setup
const CONFIG_FILE = `${process.env.HOME}/.config/pai/notion-config.json`;

interface NotionConfig {
  dashboardPageId: string;
  databaseIds: {
    dailyTracking: string;
    weeklyReviews: string;
    goals2026: string;
  };
}

async function loadConfig(): Promise<NotionConfig | null> {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (await file.exists()) {
      return await file.json();
    }
  } catch (e) {
    console.error('No se pudo cargar config:', e);
  }
  return null;
}

async function notionAPI(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${API_BASE}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Notion-Version': API_VERSION,
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API ${response.status}: ${error}`);
  }

  return await response.json();
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function queryDatabase(databaseId: string, filter?: any, sorts?: any[]) {
  return await notionAPI(`/databases/${databaseId}/query`, 'POST', {
    filter,
    sorts
  });
}

export async function getPage(pageId: string) {
  return await notionAPI(`/pages/${pageId}`);
}

export async function searchPages(query: string) {
  return await notionAPI('/search', 'POST', {
    query,
    filter: { property: 'object', value: 'page' }
  });
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

export async function createPage(databaseId: string, properties: any) {
  return await notionAPI('/pages', 'POST', {
    parent: { database_id: databaseId },
    properties
  });
}

export async function updatePage(pageId: string, properties: any) {
  return await notionAPI(`/pages/${pageId}`, 'PATCH', {
    properties
  });
}

// ============================================================================
// PAI SPECIFIC OPERATIONS
// ============================================================================

export async function createDailyEntry(date: Date, dayType: 'PAR' | 'IMPAR') {
  const config = await loadConfig();
  if (!config) throw new Error('Config no encontrada. Ejecuta setup primero.');

  const dateStr = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const dateISO = date.toISOString().split('T')[0];

  return await createPage(config.databaseIds.dailyTracking, {
    'Fecha': {
      title: [{ type: 'text', text: { content: dateStr } }]
    },
    'Date': {
      date: { start: dateISO }
    },
    'Tipo Día': {
      select: { name: dayType }
    },
    'Status': {
      status: { name: 'Planned' }
    },
    'Hábitos Score': { number: 0 },
    'Racha': { number: 0 },
    'Aplicaciones': { number: 0 },
    'Outreach': { number: 0 },
    'Posts LinkedIn': { number: 0 },
    'Commits': { number: 0 }
  });
}

export async function updateDailyEntry(
  pageId: string,
  habits: number[],
  activity: { aplicaciones: number; outreach: number; posts: number; commits: number },
  learning: string,
  streak: number
) {
  return await updatePage(pageId, {
    'Hábito 1: Gym': { checkbox: habits.includes(1) },
    'Hábito 2: Palabra=Ley': { checkbox: habits.includes(2) },
    'Hábito 3: 0 Alcohol/Tabaco': { checkbox: habits.includes(3) },
    'Hábito 4: Founder Flow': { checkbox: habits.includes(4) },
    'Hábito 5: Acción Comercial': { checkbox: habits.includes(5) },
    'Hábitos Score': { number: habits.length },
    'Aplicaciones': { number: activity.aplicaciones },
    'Outreach': { number: activity.outreach },
    'Posts LinkedIn': { number: activity.posts },
    'Commits': { number: activity.commits },
    'Learning del Día': {
      rich_text: [{ type: 'text', text: { content: learning } }]
    },
    'Racha': { number: streak },
    'Status': { status: { name: 'Complete' } }
  });
}

export async function getTodayEntry() {
  const config = await loadConfig();
  if (!config) throw new Error('Config no encontrada');

  const today = new Date().toISOString().split('T')[0];

  const results = await queryDatabase(
    config.databaseIds.dailyTracking,
    {
      property: 'Date',
      date: { equals: today }
    }
  );

  return results.results[0] || null;
}

// ============================================================================
// CLI TESTING
// ============================================================================

async function testConnection() {
  console.log('🔍 Probando conexión con Notion...\n');

  try {
    // Test 1: Buscar páginas
    console.log('1. Buscando páginas...');
    const search = await searchPages('PAI');
    console.log(`   ✅ Encontradas ${search.results.length} páginas`);

    // Test 2: Cargar config
    console.log('\n2. Cargando configuración...');
    const config = await loadConfig();
    if (config) {
      console.log(`   ✅ Config cargada`);
      console.log(`   - Dashboard: ${config.dashboardPageId}`);
      console.log(`   - Daily Tracking: ${config.databaseIds.dailyTracking}`);
    } else {
      console.log(`   ⚠️  No hay config. Ejecuta setup primero.`);
    }

    // Test 3: Query Daily Tracking
    if (config) {
      console.log('\n3. Consultando Daily Tracking...');
      const entries = await queryDatabase(config.databaseIds.dailyTracking);
      console.log(`   ✅ ${entries.results.length} entradas encontradas`);
    }

    // Test 4: Buscar entrada de hoy
    if (config) {
      console.log('\n4. Buscando entrada de hoy...');
      const today = await getTodayEntry();
      if (today) {
        console.log(`   ✅ Entrada de hoy existe: ${today.id}`);
      } else {
        console.log(`   ℹ️  No hay entrada para hoy aún`);
      }
    }

    console.log('\n✅ CONEXIÓN EXITOSA - Notion API funcionando correctamente\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  }
}

// Run test if called directly
if (import.meta.main) {
  testConnection();
}

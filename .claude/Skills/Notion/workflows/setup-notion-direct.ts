#!/usr/bin/env bun
/**
 * Setup Notion Direct - Sin MCP
 * Usa la API de Notion directamente via HTTP
 */

import { $ } from 'bun';

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const API_KEY = process.env.NOTION_API_KEY;

if (!API_KEY) {
  console.error('❌ ERROR: NOTION_API_KEY no encontrada en environment');
  process.exit(1);
}

// ============================================================================
// NOTION API HELPERS
// ============================================================================

async function notionFetch(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${NOTION_API_BASE}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n🔄 ${method} ${endpoint}`);

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    console.error(`\n❌ Error ${response.status}:`, error);
    throw new Error(`Notion API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Success`);

  return data;
}

// ============================================================================
// CREATE DATABASES
// ============================================================================

async function createDashboardPage() {
  console.log('\n📄 Creando página principal...');

  // Primero necesitamos buscar el workspace o una página parent
  // Para crear en workspace root, usamos el search para encontrar una página
  const searchResult = await notionFetch('/search', 'POST', {
    filter: { property: 'object', value: 'page' },
    page_size: 1
  });

  let parentId;

  if (searchResult.results && searchResult.results.length > 0) {
    // Usar la primera página encontrada como parent
    parentId = searchResult.results[0].id;
    console.log(`   Usando página existente como parent: ${parentId}`);
  }

  const body: any = {
    parent: parentId
      ? { type: 'page_id', page_id: parentId }
      : { type: 'workspace', workspace: true },
    properties: {
      title: {
        title: [
          {
            text: { content: '🎯 PAI 2026 Dashboard - Marc Bau' }
          }
        ]
      }
    },
    children: [
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: '🎯 PAI 2026 Dashboard' } }]
        }
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [
            { text: { content: 'Sistema automatizado de tracking para transformación 2026\n\n' } },
            { text: { content: '✅ Hábitos diarios\n' } },
            { text: { content: '📈 Progreso semanal\n' } },
            { text: { content: '🎯 Metas anuales' } }
          ],
          icon: { type: 'emoji', emoji: '🚀' },
          color: 'blue_background'
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📊 Databases' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: 'Las databases se crearán a continuación...' } }]
        }
      }
    ]
  };

  const page = await notionFetch('/pages', 'POST', body);

  console.log(`   ✅ Dashboard creado: ${page.id}`);
  console.log(`   🔗 URL: ${page.url}`);

  return page;
}

async function createDailyTrackingDB(parentPageId: string) {
  console.log('\n📊 Creando Daily Tracking database...');

  const body = {
    parent: {
      type: 'page_id',
      page_id: parentPageId
    },
    title: [
      {
        text: { content: '📅 Daily Tracking - PAI 2026' }
      }
    ],
    is_inline: true,
    properties: {
      'Fecha': {
        title: {}
      },
      'Date': {
        date: {}
      },
      'Tipo Día': {
        select: {
          options: [
            { name: 'PAR', color: 'blue' },
            { name: 'IMPAR', color: 'purple' }
          ]
        }
      },
      'Status': {
        status: {
          options: [
            { name: 'Planned', color: 'gray' },
            { name: 'In Progress', color: 'yellow' },
            { name: 'Complete', color: 'green' }
          ]
        }
      },
      'Hábito 1: Gym': { checkbox: {} },
      'Hábito 2: Palabra=Ley': { checkbox: {} },
      'Hábito 3: 0 Alcohol/Tabaco': { checkbox: {} },
      'Hábito 4: Founder Flow': { checkbox: {} },
      'Hábito 5: Acción Comercial': { checkbox: {} },
      'Hábitos Score': {
        number: { format: 'number' }
      },
      'Aplicaciones': {
        number: { format: 'number' }
      },
      'Outreach': {
        number: { format: 'number' }
      },
      'Posts LinkedIn': {
        number: { format: 'number' }
      },
      'Commits': {
        number: { format: 'number' }
      },
      'Learning del Día': {
        rich_text: {}
      },
      'Racha': {
        number: { format: 'number' }
      }
    }
  };

  const db = await notionFetch('/databases', 'POST', body);

  console.log(`   ✅ Database creada: ${db.id}`);
  console.log(`   🔗 URL: ${db.url}`);

  return db;
}

async function createWeeklyReviewsDB(parentPageId: string) {
  console.log('\n📊 Creando Weekly Reviews database...');

  const body = {
    parent: {
      type: 'page_id',
      page_id: parentPageId
    },
    title: [
      {
        text: { content: '📈 Weekly Reviews - PAI 2026' }
      }
    ],
    is_inline: true,
    properties: {
      'Semana': {
        title: {}
      },
      'Fecha Inicio': {
        date: {}
      },
      'Rango': {
        rich_text: {}
      },
      'Score Total': {
        number: { format: 'number' }
      },
      'Porcentaje': {
        number: { format: 'percent' }
      },
      'Días Perfectos': {
        number: { format: 'number' }
      },
      'Hábito Más Fuerte': {
        select: {
          options: [
            { name: '1', color: 'red' },
            { name: '2', color: 'orange' },
            { name: '3', color: 'yellow' },
            { name: '4', color: 'green' },
            { name: '5', color: 'blue' }
          ]
        }
      },
      'Hábito Más Débil': {
        select: {
          options: [
            { name: '1', color: 'red' },
            { name: '2', color: 'orange' },
            { name: '3', color: 'yellow' },
            { name: '4', color: 'green' },
            { name: '5', color: 'blue' }
          ]
        }
      },
      'Tendencia': {
        select: {
          options: [
            { name: '↗️ Subiendo', color: 'green' },
            { name: '→ Estable', color: 'yellow' },
            { name: '↘️ Bajando', color: 'red' }
          ]
        }
      },
      'Insights': {
        rich_text: {}
      },
      'Recomendaciones': {
        rich_text: {}
      }
    }
  };

  const db = await notionFetch('/databases', 'POST', body);

  console.log(`   ✅ Database creada: ${db.id}`);
  console.log(`   🔗 URL: ${db.url}`);

  return db;
}

async function createGoals2026DB(parentPageId: string) {
  console.log('\n📊 Creando 2026 Goals database...');

  const body = {
    parent: {
      type: 'page_id',
      page_id: parentPageId
    },
    title: [
      {
        text: { content: '🎯 2026 Goals - PAI' }
      }
    ],
    is_inline: true,
    properties: {
      'Goal': {
        title: {}
      },
      'Quarter': {
        select: {
          options: [
            { name: 'Q1', color: 'blue' },
            { name: 'Q2', color: 'green' },
            { name: 'Q3', color: 'yellow' },
            { name: 'Q4', color: 'purple' }
          ]
        }
      },
      'Category': {
        select: {
          options: [
            { name: 'Trabajo', color: 'blue' },
            { name: 'Consultoría', color: 'purple' },
            { name: 'Contenido', color: 'green' },
            { name: 'Hábitos', color: 'red' }
          ]
        }
      },
      'Target': {
        number: { format: 'number' }
      },
      'Current': {
        number: { format: 'number' }
      },
      'Progress': {
        number: { format: 'percent' }
      },
      'Status': {
        status: {
          options: [
            { name: 'On Track', color: 'green' },
            { name: 'At Risk', color: 'yellow' },
            { name: 'Behind', color: 'red' }
          ]
        }
      }
    }
  };

  const db = await notionFetch('/databases', 'POST', body);

  console.log(`   ✅ Database creada: ${db.id}`);
  console.log(`   🔗 URL: ${db.url}`);

  return db;
}

async function createExampleEntry(dbId: string) {
  console.log('\n📝 Creando entrada de ejemplo...');

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const todayISO = today.toISOString().split('T')[0];
  const dayType = today.getDate() % 2 === 0 ? 'PAR' : 'IMPAR';

  const body = {
    parent: {
      database_id: dbId
    },
    properties: {
      'Fecha': {
        title: [{ text: { content: todayStr } }]
      },
      'Date': {
        date: { start: todayISO }
      },
      'Tipo Día': {
        select: { name: dayType }
      },
      'Status': {
        status: { name: 'Planned' }
      },
      'Hábitos Score': {
        number: 0
      },
      'Racha': {
        number: 0
      },
      'Aplicaciones': {
        number: 0
      },
      'Outreach': {
        number: 0
      },
      'Posts LinkedIn': {
        number: 0
      },
      'Commits': {
        number: 0
      }
    }
  };

  const page = await notionFetch('/pages', 'POST', body);

  console.log(`   ✅ Entrada creada para ${todayStr}`);

  return page;
}

async function saveConfig(config: any) {
  const configDir = `${process.env.HOME}/.config/pai`;
  const configFile = `${configDir}/notion-config.json`;

  await $`mkdir -p ${configDir}`;
  await Bun.write(configFile, JSON.stringify(config, null, 2));

  console.log(`\n✅ Configuración guardada en: ${configFile}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 INICIANDO SETUP DE NOTION PARA PAI (API Directa)');
  console.log('='.repeat(60));

  try {
    // 1. Crear dashboard principal
    console.log('\n📋 PASO 1: Página Principal del Dashboard');
    const dashboard = await createDashboardPage();

    // 2. Crear databases
    console.log('\n📋 PASO 2: Creación de Databases');

    const dailyTracking = await createDailyTrackingDB(dashboard.id);
    const weeklyReviews = await createWeeklyReviewsDB(dashboard.id);
    const goals2026 = await createGoals2026DB(dashboard.id);

    // 3. Crear entrada de ejemplo
    console.log('\n📋 PASO 3: Entrada de Ejemplo');
    await createExampleEntry(dailyTracking.id);

    // 4. Guardar configuración
    console.log('\n📋 PASO 4: Guardar Configuración');
    const config = {
      apiKey: '***',
      dashboardPageId: dashboard.id,
      dashboardUrl: dashboard.url,
      databaseIds: {
        dailyTracking: dailyTracking.id,
        weeklyReviews: weeklyReviews.id,
        goals2026: goals2026.id
      },
      databaseUrls: {
        dailyTracking: dailyTracking.url,
        weeklyReviews: weeklyReviews.url,
        goals2026: goals2026.url
      },
      autoSync: {
        morning: true,
        evening: true,
        weeklyReview: true
      }
    };

    await saveConfig(config);

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ SETUP COMPLETADO EXITOSAMENTE\n');
    console.log('📊 DATABASES CREADAS:\n');
    console.log(`   1. Daily Tracking`);
    console.log(`      ID: ${dailyTracking.id}`);
    console.log(`      URL: ${dailyTracking.url}\n`);
    console.log(`   2. Weekly Reviews`);
    console.log(`      ID: ${weeklyReviews.id}`);
    console.log(`      URL: ${weeklyReviews.url}\n`);
    console.log(`   3. 2026 Goals`);
    console.log(`      ID: ${goals2026.id}`);
    console.log(`      URL: ${goals2026.url}\n`);
    console.log(`📄 Dashboard Principal:`);
    console.log(`   ID: ${dashboard.id}`);
    console.log(`   URL: ${dashboard.url}\n`);
    console.log('🎯 ¡TODO LISTO!');
    console.log('   Abre Notion y verás tu dashboard PAI 2026 con las 3 databases');
    console.log('   Ya puedes usar /morning y /evening para sincronizar\n');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

main();

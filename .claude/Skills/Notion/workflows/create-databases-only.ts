#!/usr/bin/env bun
/**
 * Create Databases Only
 * Crea las 3 databases directamente en la página existente del usuario
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const API_KEY = process.env.NOTION_API_KEY;

if (!API_KEY) {
  console.error('❌ ERROR: NOTION_API_KEY no encontrada');
  console.error('   Ejecuta: export NOTION_API_KEY="ntn_YOUR_TOKEN"');
  process.exit(1);
}

// Page ID de la página que el usuario ya creó
const PARENT_PAGE_ID = '2dad87f9d70f80dfbf14c814ac70d4a4';

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

  try {
    const response = await fetch(url, options);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`\n❌ Error ${response.status}: ${responseText}`);
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    console.log(`✅ Success`);

    return data;
  } catch (error: any) {
    console.error(`\n❌ Fetch error:`, error.message);
    throw error;
  }
}

async function createDailyTrackingDB(parentPageId: string) {
  console.log('\n📊 Creando Daily Tracking database...');

  const body = {
    parent: {
      type: 'page_id',
      page_id: parentPageId.replace(/-/g, '') // Remove dashes if any
    },
    title: [
      {
        type: 'text',
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
      page_id: parentPageId.replace(/-/g, '')
    },
    title: [
      {
        type: 'text',
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
      page_id: parentPageId.replace(/-/g, '')
    },
    title: [
      {
        type: 'text',
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
      database_id: dbId.replace(/-/g, '')
    },
    properties: {
      'Fecha': {
        title: [{ type: 'text', text: { content: todayStr } }]
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

  await Bun.$`mkdir -p ${configDir}`;
  await Bun.write(configFile, JSON.stringify(config, null, 2));

  console.log(`\n✅ Configuración guardada en: ${configFile}`);
}

async function main() {
  console.log('\n🚀 CREANDO DATABASES EN TU PÁGINA DE NOTION');
  console.log('='.repeat(60));
  console.log(`\n📄 Página parent: ${PARENT_PAGE_ID}`);

  try {
    // Crear las 3 databases
    console.log('\n📋 Creando Databases...');

    const dailyTracking = await createDailyTrackingDB(PARENT_PAGE_ID);
    const weeklyReviews = await createWeeklyReviewsDB(PARENT_PAGE_ID);
    const goals2026 = await createGoals2026DB(PARENT_PAGE_ID);

    // Crear entrada de ejemplo
    console.log('\n📋 Creando Entrada de Ejemplo...');
    await createExampleEntry(dailyTracking.id);

    // Guardar configuración
    console.log('\n📋 Guardando Configuración...');
    const config = {
      apiKey: '***',
      dashboardPageId: PARENT_PAGE_ID,
      dashboardUrl: `https://notion.so/${PARENT_PAGE_ID}`,
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
    console.log('\n✅ ¡TODO LISTO!\n');
    console.log('📊 DATABASES CREADAS:\n');
    console.log(`   1. 📅 Daily Tracking`);
    console.log(`      ${dailyTracking.url}\n`);
    console.log(`   2. 📈 Weekly Reviews`);
    console.log(`      ${weeklyReviews.url}\n`);
    console.log(`   3. 🎯 2026 Goals`);
    console.log(`      ${goals2026.url}\n`);
    console.log(`📄 Abre tu página en Notion:`);
    console.log(`   https://notion.so/${PARENT_PAGE_ID}\n`);
    console.log('🎯 YA PUEDES USAR:');
    console.log('   /morning → Crea entrada diaria automática');
    console.log('   /evening → Actualiza con hábitos y actividad');
    console.log('   /weekreview → Análisis semanal los domingos\n');
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

main();

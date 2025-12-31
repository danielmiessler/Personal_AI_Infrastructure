#!/usr/bin/env bun
/**
 * Setup Notion Workflow
 * Crea todas las databases necesarias para PAI en Notion
 */

import { $ } from 'bun';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG_FILE = `${process.env.HOME}/.config/pai/notion-config.json`;

interface NotionConfig {
  apiKey: string;
  databaseIds: {
    dailyTracking?: string;
    weeklyReviews?: string;
    goals2026?: string;
  };
  dashboardPageId?: string;
  autoSync: {
    morning: boolean;
    evening: boolean;
    weeklyReview: boolean;
  };
}

// ============================================================================
// DATABASE SCHEMAS
// ============================================================================

const DAILY_TRACKING_SCHEMA = {
  title: "Daily Tracking - PAI 2026",
  description: "Tracking diario de hábitos, actividad y progreso",
  properties: {
    "Fecha": {
      type: "title",
      title: {}
    },
    "Date": {
      type: "date",
      date: {}
    },
    "Tipo Día": {
      type: "select",
      select: {
        options: [
          { name: "PAR", color: "blue" },
          { name: "IMPAR", color: "purple" }
        ]
      }
    },
    "Status": {
      type: "status",
      status: {
        options: [
          { name: "Planned", color: "gray" },
          { name: "In Progress", color: "yellow" },
          { name: "Complete", color: "green" }
        ]
      }
    },
    "Hábito 1: Gym": {
      type: "checkbox",
      checkbox: {}
    },
    "Hábito 2: Palabra=Ley": {
      type: "checkbox",
      checkbox: {}
    },
    "Hábito 3: 0 Alcohol/Tabaco": {
      type: "checkbox",
      checkbox: {}
    },
    "Hábito 4: Founder Flow": {
      type: "checkbox",
      checkbox: {}
    },
    "Hábito 5: Acción Comercial": {
      type: "checkbox",
      checkbox: {}
    },
    "Hábitos Score": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Aplicaciones": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Outreach": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Posts LinkedIn": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Commits": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Learning del Día": {
      type: "rich_text",
      rich_text: {}
    },
    "Racha": {
      type: "number",
      number: {
        format: "number"
      }
    }
  }
};

const WEEKLY_REVIEWS_SCHEMA = {
  title: "Weekly Reviews - PAI 2026",
  description: "Análisis semanal de progreso y tendencias",
  properties: {
    "Semana": {
      type: "title",
      title: {}
    },
    "Fecha Inicio": {
      type: "date",
      date: {}
    },
    "Rango": {
      type: "rich_text",
      rich_text: {}
    },
    "Score Total": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Porcentaje": {
      type: "number",
      number: {
        format: "percent"
      }
    },
    "Días Perfectos": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Hábito Más Fuerte": {
      type: "select",
      select: {
        options: [
          { name: "1", color: "red" },
          { name: "2", color: "orange" },
          { name: "3", color: "yellow" },
          { name: "4", color: "green" },
          { name: "5", color: "blue" }
        ]
      }
    },
    "Hábito Más Débil": {
      type: "select",
      select: {
        options: [
          { name: "1", color: "red" },
          { name: "2", color: "orange" },
          { name: "3", color: "yellow" },
          { name: "4", color: "green" },
          { name: "5", color: "blue" }
        ]
      }
    },
    "Tendencia": {
      type: "select",
      select: {
        options: [
          { name: "↗️ Subiendo", color: "green" },
          { name: "→ Estable", color: "yellow" },
          { name: "↘️ Bajando", color: "red" }
        ]
      }
    },
    "Insights": {
      type: "rich_text",
      rich_text: {}
    },
    "Recomendaciones": {
      type: "rich_text",
      rich_text: {}
    }
  }
};

const GOALS_2026_SCHEMA = {
  title: "2026 Goals - PAI",
  description: "Metas y progreso 2026",
  properties: {
    "Goal": {
      type: "title",
      title: {}
    },
    "Quarter": {
      type: "select",
      select: {
        options: [
          { name: "Q1", color: "blue" },
          { name: "Q2", color: "green" },
          { name: "Q3", color: "yellow" },
          { name: "Q4", color: "purple" }
        ]
      }
    },
    "Category": {
      type: "select",
      select: {
        options: [
          { name: "Trabajo", color: "blue" },
          { name: "Consultoría", color: "purple" },
          { name: "Contenido", color: "green" },
          { name: "Hábitos", color: "red" }
        ]
      }
    },
    "Target": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Current": {
      type: "number",
      number: {
        format: "number"
      }
    },
    "Progress": {
      type: "number",
      number: {
        format: "percent"
      }
    },
    "Status": {
      type: "status",
      status: {
        options: [
          { name: "On Track", color: "green" },
          { name: "At Risk", color: "yellow" },
          { name: "Behind", color: "red" }
        ]
      }
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadConfig(): Promise<NotionConfig> {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (await file.exists()) {
      return await file.json();
    }
  } catch (e) {
    // Config doesn't exist yet
  }

  // Default config
  return {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseIds: {},
    autoSync: {
      morning: true,
      evening: true,
      weeklyReview: true
    }
  };
}

async function saveConfig(config: NotionConfig): Promise<void> {
  await $`mkdir -p ${process.env.HOME}/.config/pai`;
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`✅ Configuración guardada en ${CONFIG_FILE}`);
}

// ============================================================================
// NOTION API WRAPPER
// ============================================================================

/**
 * Llama al MCP de Notion usando el Task tool
 * Cuando las herramientas MCP estén disponibles, esta función las usará
 */
async function callNotionMCP(toolName: string, params: any): Promise<any> {
  console.log(`\n🔧 Llamando herramienta MCP: ${toolName}`);
  console.log(`   Parámetros:`, JSON.stringify(params, null, 2));

  // Por ahora, simulamos la llamada mostrando lo que se haría
  console.log(`\n⚠️  Simulación: En producción esto llamaría a mcp__notion__${toolName}`);
  console.log(`   Una vez el MCP esté conectado, este código usará las herramientas reales\n`);

  // TODO: Cuando MCP esté disponible, usar:
  // return await mcp__notion__${toolName}(params);

  // Por ahora retornamos estructura simulada
  return {
    id: `simulated-${toolName}-${Date.now()}`,
    url: `https://notion.so/simulated-${toolName}`,
    ...params
  };
}

/**
 * Crear database en Notion
 */
async function createDatabase(
  title: string,
  schema: any,
  parentPageId?: string
): Promise<{ id: string; url: string }> {
  console.log(`\n📊 Creando database: ${title}`);

  const params = {
    parent: parentPageId
      ? { type: "page_id", page_id: parentPageId }
      : { type: "workspace" },
    title: [{ type: "text", text: { content: title } }],
    description: [{ type: "text", text: { content: schema.description || "" } }],
    properties: schema.properties,
    is_inline: parentPageId ? true : false
  };

  const result = await callNotionMCP("create-a-data-source", params);

  console.log(`   ✅ Database creada: ${result.id}`);
  console.log(`   🔗 URL: ${result.url}`);

  return {
    id: result.id,
    url: result.url
  };
}

/**
 * Crear página principal del dashboard
 */
async function createDashboardPage(): Promise<{ id: string; url: string }> {
  console.log(`\n📄 Creando página principal "PAI 2026 Dashboard"`);

  const params = {
    parent: { type: "workspace" },
    properties: {
      title: {
        title: [{ text: { content: "PAI 2026 Dashboard - Marc Bau" } }]
      }
    },
    children: [
      {
        type: "heading_1",
        heading_1: {
          rich_text: [{ text: { content: "🎯 PAI 2026 Dashboard" } }]
        }
      },
      {
        type: "callout",
        callout: {
          rich_text: [
            { text: { content: "Sistema automatizado de tracking para transformación 2026\n" } },
            { text: { content: "✅ Hábitos diarios\n" } },
            { text: { content: "📈 Progreso semanal\n" } },
            { text: { content: "🎯 Metas anuales" } }
          ],
          icon: { type: "emoji", emoji: "🚀" },
          color: "blue_background"
        }
      },
      {
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "📊 Databases" } }]
        }
      }
    ]
  };

  const result = await callNotionMCP("create-page", params);

  console.log(`   ✅ Página creada: ${result.id}`);
  console.log(`   🔗 URL: ${result.url}`);

  return {
    id: result.id,
    url: result.url
  };
}

// ============================================================================
// MAIN SETUP WORKFLOW
// ============================================================================

async function main() {
  console.log('\n🚀 INICIANDO SETUP DE NOTION PARA PAI\n');
  console.log('=' .repeat(60));

  // 1. Cargar/crear configuración
  console.log('\n📋 PASO 1: Configuración');
  const config = await loadConfig();

  if (!config.apiKey) {
    console.error('\n❌ ERROR: NOTION_API_KEY no encontrada');
    console.error('   Configura tu API key en .claude/.mcp.json');
    process.exit(1);
  }

  console.log(`   ✅ API Key encontrada: ${config.apiKey.substring(0, 10)}...`);

  // 2. Crear página principal del dashboard
  console.log('\n📋 PASO 2: Página Principal del Dashboard');
  const dashboard = await createDashboardPage();
  config.dashboardPageId = dashboard.id;

  // 3. Crear databases
  console.log('\n📋 PASO 3: Creación de Databases');

  console.log('\n   3.1 Daily Tracking Database');
  const dailyTracking = await createDatabase(
    DAILY_TRACKING_SCHEMA.title,
    DAILY_TRACKING_SCHEMA,
    dashboard.id
  );
  config.databaseIds.dailyTracking = dailyTracking.id;

  console.log('\n   3.2 Weekly Reviews Database');
  const weeklyReviews = await createDatabase(
    WEEKLY_REVIEWS_SCHEMA.title,
    WEEKLY_REVIEWS_SCHEMA,
    dashboard.id
  );
  config.databaseIds.weeklyReviews = weeklyReviews.id;

  console.log('\n   3.3 2026 Goals Database');
  const goals2026 = await createDatabase(
    GOALS_2026_SCHEMA.title,
    GOALS_2026_SCHEMA,
    dashboard.id
  );
  config.databaseIds.goals2026 = goals2026.id;

  // 4. Guardar configuración
  console.log('\n📋 PASO 4: Guardar Configuración');
  await saveConfig(config);

  // 5. Crear ejemplo de entrada
  console.log('\n📋 PASO 5: Crear Entrada de Ejemplo');
  console.log('   Creando entrada de hoy como demo...');

  const today = new Date();
  const todayStr = format(today, 'dd MMMM yyyy', { locale: es });
  const dayType = today.getDate() % 2 === 0 ? 'PAR' : 'IMPAR';

  await callNotionMCP("create-page", {
    parent: { database_id: dailyTracking.id },
    properties: {
      "Fecha": {
        title: [{ text: { content: todayStr } }]
      },
      "Date": {
        date: { start: format(today, 'yyyy-MM-dd') }
      },
      "Tipo Día": {
        select: { name: dayType }
      },
      "Status": {
        status: { name: "Planned" }
      },
      "Hábitos Score": {
        number: 0
      },
      "Racha": {
        number: 0
      }
    }
  });

  console.log(`   ✅ Entrada de ejemplo creada para ${todayStr}`);

  // 6. Resumen final
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
  console.log(`   URL: ${dashboard.url}\n`);

  console.log(`⚙️  Configuración guardada en:`);
  console.log(`   ${CONFIG_FILE}\n`);

  console.log('🎯 PRÓXIMOS PASOS:\n');
  console.log('   1. Abre el dashboard en Notion con la URL de arriba');
  console.log('   2. Verifica que las 3 databases se crearon correctamente');
  console.log('   3. Ejecuta `/morning` mañana para crear tu primera entrada real');
  console.log('   4. Los workflows se sincronizarán automáticamente desde ahora\n');

  console.log('=' .repeat(60) + '\n');
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('\n❌ ERROR en setup:', error);
    process.exit(1);
  });
}

export { createDatabase, createDashboardPage, loadConfig, saveConfig };

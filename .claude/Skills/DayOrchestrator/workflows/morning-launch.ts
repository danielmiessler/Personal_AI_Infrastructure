#!/usr/bin/env bun
/**
 * Morning Launch Workflow
 * Orquestador automático matutino - lanza agentes paralelos según tipo de día
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DayConfig {
  date: Date;
  dayOfWeek: number; // 0=domingo, 1=lunes, etc
  dayOfMonth: number;
  isEven: boolean; // día par/impar
  isWeekday: boolean;
  needsContent: boolean; // martes/jueves
}

interface AgentTask {
  name: string;
  description: string;
  model: 'haiku' | 'sonnet' | 'opus';
  priority: number;
}

interface MorningBriefing {
  dayConfig: DayConfig;
  agentTasks: AgentTask[];
  checklist: string[];
  focus: string;
  metrics: {
    applications?: number;
    outreach?: number;
    posts?: number;
  };
}

/**
 * Determinar configuración del día
 */
function getDayConfig(): DayConfig {
  const date = new Date();
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const isEven = dayOfMonth % 2 === 0;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const needsContent = dayOfWeek === 2 || dayOfWeek === 4; // martes/jueves

  return {
    date,
    dayOfWeek,
    dayOfMonth,
    isEven,
    isWeekday,
    needsContent
  };
}

/**
 * Generar lista de agentes a lanzar según tipo de día
 */
function getAgentTasks(config: DayConfig): AgentTask[] {
  const tasks: AgentTask[] = [];

  if (config.isEven) {
    // DÍA PAR - Aplicaciones trabajo
    tasks.push(
      {
        name: 'Research Empresas',
        description: 'Investigar 5 empresas target para aplicaciones',
        model: 'haiku',
        priority: 1
      },
      {
        name: 'Analizar Job Postings',
        description: 'Fabric analyze_job_posting en 5 descripciones',
        model: 'haiku',
        priority: 1
      },
      {
        name: 'Personalizar CVs',
        description: 'Generar 5 CVs personalizados según empresas',
        model: 'sonnet',
        priority: 2
      },
      {
        name: 'Cartas Motivación',
        description: 'AlexHormozi framework para 5 cartas',
        model: 'sonnet',
        priority: 2
      },
      {
        name: 'Spotcheck Calidad',
        description: 'Verificar personalización y coherencia',
        model: 'haiku',
        priority: 3
      }
    );
  } else {
    // DÍA IMPAR - Outreach consultoría
    tasks.push(
      {
        name: 'Research Mid-Market',
        description: 'Investigar 10 empresas mid-market (5-50 empleados, 1-10M€)',
        model: 'haiku',
        priority: 1
      },
      {
        name: 'Pain Points IA',
        description: 'Identificar pain points IA específicos de cada empresa',
        model: 'sonnet',
        priority: 1
      },
      {
        name: 'Propuestas Personalizadas',
        description: 'Generar 10 propuestas con AlexHormozi framework',
        model: 'sonnet',
        priority: 2
      },
      {
        name: 'Emails Outreach',
        description: 'Crear emails con templates de 05_SCRIPTS_TEMPLATES.md',
        model: 'haiku',
        priority: 2
      },
      {
        name: 'Spotcheck Personalización',
        description: 'Verificar que cada propuesta está personalizada (no genérica)',
        model: 'haiku',
        priority: 3
      }
    );
  }

  // Contenido LinkedIn (martes/jueves)
  if (config.needsContent) {
    tasks.push(
      {
        name: 'Ideas Posts LinkedIn',
        description: 'Generar 2-3 ideas posts según estrategia 03_LINKEDIN_STRATEGY.md',
        model: 'sonnet',
        priority: 1
      },
      {
        name: 'Visuales Posts',
        description: 'Art skill para crear imágenes de los posts',
        model: 'haiku',
        priority: 2
      }
    );
  }

  return tasks.sort((a, b) => a.priority - b.priority);
}

/**
 * Generar checklist ejecutable para el usuario
 */
function generateChecklist(config: DayConfig): string[] {
  const checklist: string[] = [];

  if (config.isEven) {
    checklist.push(
      'Revisar 5 aplicaciones preparadas en ~/PAI_Output/[fecha]/',
      'Personalizar detalles finales si necesario',
      'Enviar las 5 aplicaciones',
      'Trackear en CRM/spreadsheet'
    );
  } else {
    checklist.push(
      'Revisar 10 propuestas en ~/PAI_Output/[fecha]/',
      'Ajustar personalización final',
      'Copiar emails y enviar outreach',
      'Programar follow-ups en 3-5 días'
    );
  }

  if (config.needsContent) {
    checklist.push(
      'Revisar 2 posts LinkedIn preparados',
      'Editar si necesario',
      'Publicar en LinkedIn',
      'Engagement en primeros 30 min'
    );
  }

  checklist.push(
    'Completar 2h Founder Flow (ya llevas tiempo trabajando)',
    'Hacer 1 acción comercial adicional si es rápida',
    'Trackear progreso en métricas'
  );

  return checklist;
}

/**
 * Generar briefing completo del día
 */
function generateBriefing(config: DayConfig, tasks: AgentTask[]): MorningBriefing {
  const checklist = generateChecklist(config);

  const focus = config.isEven
    ? 'Aplicaciones trabajo (5 targets)'
    : 'Outreach consultoría (10 empresas mid-market)';

  const metrics = config.isEven
    ? { applications: 5 }
    : { outreach: 10 };

  if (config.needsContent) {
    metrics.posts = 2;
  }

  return {
    dayConfig: config,
    agentTasks: tasks,
    checklist,
    focus,
    metrics
  };
}

/**
 * Formatear output para MARC
 */
function formatBriefing(briefing: MorningBriefing): string {
  const { dayConfig, agentTasks, checklist, focus, metrics } = briefing;

  const dayName = format(dayConfig.date, 'EEEE', { locale: es });
  const dateStr = format(dayConfig.date, 'dd MMMM yyyy', { locale: es });
  const dayType = dayConfig.isEven ? 'PAR' : 'IMPAR';

  let output = `# 🌅 BRIEFING DÍA ${dateStr}\n\n`;
  output += `**Tipo de día:** ${dayType} - ${dayName}\n`;
  output += `**Foco:** ${focus}\n\n`;

  output += `## 🤖 Agentes Lanzados (paralelo):\n\n`;
  agentTasks.forEach((task, i) => {
    output += `${i + 1}. **${task.name}** (${task.model})\n`;
    output += `   ${task.description}\n\n`;
  });

  output += `## ✅ Tu Checklist de Ejecución:\n\n`;
  checklist.forEach((item, i) => {
    output += `${i + 1}. [ ] ${item}\n`;
  });

  output += `\n## 📊 Métricas del Día:\n\n`;
  if (metrics.applications) output += `- Aplicaciones target: **${metrics.applications}**\n`;
  if (metrics.outreach) output += `- Outreach target: **${metrics.outreach}**\n`;
  if (metrics.posts) output += `- Posts LinkedIn: **${metrics.posts}**\n`;

  output += `\n## 🔥 Recordatorios:\n\n`;
  output += `- ✅ Hábito 1: 6:00 AM Gym (ya hecho)\n`;
  output += `- ⏳ Hábito 2: Palabra = Ley (en curso)\n`;
  output += `- ⏳ Hábito 3: 0 alcohol, 0 tabaco (en curso)\n`;
  output += `- ⏳ Hábito 4: 2h Founder Flow (en curso - ya empezaste)\n`;
  output += `- ⏳ Hábito 5: 1 acción comercial (se completará hoy)\n`;

  output += `\n---\n\n`;
  output += `**Archivos preparados en:** \`~/PAI_Output/${format(dayConfig.date, 'yyyy-MM-dd')}/\`\n\n`;
  output += `🚀 **Todo listo. Solo ejecuta el checklist.**\n`;

  return output;
}

/**
 * MAIN EXECUTION
 */
async function main() {
  console.log('🌅 Iniciando Morning Launch...\n');

  // 1. Determinar configuración del día
  const dayConfig = getDayConfig();
  console.log(`📅 Detectado: ${dayConfig.isEven ? 'Día PAR' : 'Día IMPAR'} - ${format(dayConfig.date, 'EEEE', { locale: es })}`);

  // 2. Generar lista de agentes
  const agentTasks = getAgentTasks(dayConfig);
  console.log(`🤖 ${agentTasks.length} agentes configurados para lanzamiento paralelo\n`);

  // 3. Aquí MARC lanzará los agentes reales con Task tool
  console.log('⚡ MARC lanzará estos agentes en paralelo...');
  console.log('(Implementación real: usar Task tool con Promise.all)\n');

  // 4. Generar briefing
  const briefing = generateBriefing(dayConfig, agentTasks);
  const output = formatBriefing(briefing);

  // 5. Guardar briefing
  const outputDir = `${process.env.HOME}/PAI_Output/${format(dayConfig.date, 'yyyy-MM-dd')}`;
  await Bun.write(`${outputDir}/morning-briefing.md`, output);

  // 6. Output para MARC
  console.log(output);
  console.log(`\n✅ Briefing guardado en: ${outputDir}/morning-briefing.md`);

  return briefing;
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main, getDayConfig, getAgentTasks, generateBriefing };

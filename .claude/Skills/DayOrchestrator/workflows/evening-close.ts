#!/usr/bin/env bun
/**
 * Evening Close Workflow
 * Cierre automático nocturno - detecta actividad, trackea hábitos, genera learning
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { $ } from 'bun';

interface DayActivity {
  applications: number;
  outreach: number;
  posts: number;
  commits: number;
  filesModified: string[];
  workDuration: number; // estimado en horas
}

interface HabitInput {
  raw: string; // input del usuario
  completed: number[]; // array de hábitos cumplidos [1,2,3,4,5]
  score: number; // X/5
}

interface DayLearning {
  whatWorked: string[];
  whatWasDifficult: string[];
  keyInsight: string;
  promisesForTomorrow: string[];
}

interface EveningBriefing {
  date: Date;
  activity: DayActivity;
  habits: HabitInput;
  learning: DayLearning;
  streak: number;
  tomorrowPrep: {
    dayType: string;
    focus: string;
    agentsReady: number;
  };
}

/**
 * Detectar actividad del día automáticamente
 */
async function detectDayActivity(): Promise<DayActivity> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const outputDir = `${process.env.HOME}/PAI_Output/${today}`;

  let activity: DayActivity = {
    applications: 0,
    outreach: 0,
    posts: 0,
    commits: 0,
    filesModified: [],
    workDuration: 0
  };

  // Detectar commits del día
  try {
    const commitsResult = await $`git log --since="today 00:00" --oneline --no-merges`.text();
    activity.commits = commitsResult.trim().split('\n').filter(l => l).length;
  } catch (e) {
    console.log('⚠️  No hay repo git o no hay commits hoy');
  }

  // Detectar archivos en PAI_Output
  try {
    const files = await $`ls ${outputDir}`.text();
    const fileList = files.trim().split('\n');
    activity.filesModified = fileList;

    // Contar aplicaciones (archivos CV_*.pdf o application_*.md)
    activity.applications = fileList.filter(f =>
      f.includes('CV_') || f.includes('application_')
    ).length;

    // Contar outreach (archivos email_*.md o proposal_*.md)
    activity.outreach = fileList.filter(f =>
      f.includes('email_') || f.includes('proposal_')
    ).length;

    // Contar posts (archivos post_*.md)
    activity.posts = fileList.filter(f => f.includes('post_')).length;
  } catch (e) {
    console.log(`⚠️  No se encontró directorio ${outputDir}`);
  }

  // Estimar duración trabajo (basado en commits y archivos)
  activity.workDuration = Math.max(
    activity.commits * 0.5, // ~30 min por commit
    activity.filesModified.length * 0.25 // ~15 min por archivo
  );

  return activity;
}

/**
 * Parsear input de hábitos del usuario
 * Acepta: "todos", "todos menos 2", "1,3,4,5", etc
 */
function parseHabitInput(raw: string): HabitInput {
  const normalized = raw.toLowerCase().trim();
  let completed: number[] = [];

  if (normalized === 'todos' || normalized === 'all' || normalized === '5') {
    completed = [1, 2, 3, 4, 5];
  } else if (normalized.startsWith('todos menos')) {
    // "todos menos 2" o "todos menos 2,4"
    const missing = normalized.replace('todos menos', '').trim();
    const missingNumbers = missing.split(',').map(n => parseInt(n.trim()));
    completed = [1, 2, 3, 4, 5].filter(h => !missingNumbers.includes(h));
  } else if (normalized.match(/^[\d,\s]+$/)) {
    // "1,3,4,5" o "1 3 4 5"
    completed = normalized
      .split(/[,\s]+/)
      .map(n => parseInt(n.trim()))
      .filter(n => n >= 1 && n <= 5);
  } else {
    // Formato desconocido - asumir ninguno
    console.log('⚠️  Formato de hábitos no reconocido, asumiendo 0/5');
    completed = [];
  }

  return {
    raw,
    completed,
    score: completed.length
  };
}

/**
 * Generar learning automático del día
 */
async function generateLearning(activity: DayActivity): Promise<DayLearning> {
  const learning: DayLearning = {
    whatWorked: [],
    whatWasDifficult: [],
    keyInsight: '',
    promisesForTomorrow: []
  };

  // Análisis automático basado en actividad
  if (activity.commits > 3) {
    learning.whatWorked.push('Alta productividad en commits (foco sostenido)');
  }

  if (activity.applications > 0) {
    learning.whatWorked.push(`Completadas ${activity.applications} aplicaciones`);
  }

  if (activity.outreach > 0) {
    learning.whatWorked.push(`Realizadas ${activity.outreach} acciones de outreach`);
  }

  if (activity.posts > 0) {
    learning.whatWorked.push(`Publicados ${activity.posts} posts LinkedIn`);
  }

  if (activity.workDuration < 1) {
    learning.whatWasDifficult.push('Pocas horas de trabajo detectadas - revisar foco');
  }

  // Key insight por defecto
  learning.keyInsight = activity.commits > 2
    ? 'La consistencia en commits refleja momentum sostenido'
    : 'Los días con menos commits pueden necesitar mejor estructura';

  // Promesas para mañana (basadas en tipo de día)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIsEven = tomorrow.getDate() % 2 === 0;

  if (tomorrowIsEven) {
    learning.promisesForTomorrow = [
      '5 aplicaciones trabajo personalizadas',
      '2h Founder Flow antes de cualquier otra cosa',
      'Gym a las 6:00 AM sin excusas'
    ];
  } else {
    learning.promisesForTomorrow = [
      '10 emails outreach mid-market',
      '2h Founder Flow antes de cualquier otra cosa',
      'Gym a las 6:00 AM sin excusas'
    ];
  }

  return learning;
}

/**
 * Calcular racha actual de hábitos
 */
async function calculateStreak(): Promise<number> {
  const habitsDir = `${process.env.HOME}/PAI_Habits`;
  let streak = 0;

  try {
    // Leer archivos de hábitos desde hoy hacia atrás
    const files = await $`ls -t ${habitsDir}/*.md`.text();
    const fileList = files.trim().split('\n').reverse();

    for (const file of fileList) {
      const content = await Bun.file(file).text();

      // Buscar score en formato "**Score:** 5/5"
      const scoreMatch = content.match(/\*\*Score:\*\*\s*(\d+)\/5/);

      if (scoreMatch && scoreMatch[1] === '5') {
        streak++;
      } else {
        break; // Racha rota
      }
    }
  } catch (e) {
    console.log('⚠️  No se pudieron leer archivos de hábitos para calcular racha');
  }

  return streak;
}

/**
 * Preparar configuración para mañana
 */
function prepareTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayOfMonth = tomorrow.getDate();
  const isEven = dayOfMonth % 2 === 0;
  const dayOfWeek = tomorrow.getDay();
  const needsContent = dayOfWeek === 2 || dayOfWeek === 4;

  const dayType = isEven ? 'PAR' : 'IMPAR';
  const focus = isEven
    ? 'Aplicaciones trabajo (5 targets)'
    : 'Outreach consultoría (10 empresas mid-market)';

  // Contar agentes que se lanzarán
  let agentsReady = isEven ? 5 : 5; // Base agents
  if (needsContent) agentsReady += 2; // + LinkedIn agents

  return {
    dayType,
    focus,
    agentsReady
  };
}

/**
 * Guardar tracking de hábitos del día
 */
async function saveHabitTracking(habits: HabitInput, learning: DayLearning) {
  const habitsDir = `${process.env.HOME}/PAI_Habits`;
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'dd MMMM yyyy', { locale: es });
  const todayFile = `${habitsDir}/${today}.md`;

  // Crear directorio si no existe
  await $`mkdir -p ${habitsDir}`;

  // Generar checkboxes
  const habitLabels = [
    '1. 6:00 AM Deporte (Gym/Entrenamiento)',
    '2. Palabra = Ley (Todas promesas cumplidas)',
    '3. 0 Alcohol, 0 Tabaco',
    '4. 2h Founder Flow Diario',
    '5. 1 Acción Comercial Diaria'
  ];

  const checkboxes = habitLabels.map((label, i) => {
    const habitNum = i + 1;
    const checked = habits.completed.includes(habitNum) ? 'x' : ' ';
    return `- [${checked}] ${label}`;
  }).join('\n');

  const content = `# Hábitos - ${todayDisplay}

## Keystone Habits Checklist

${checkboxes}

**Score:** ${habits.score}/5

## Notas del Día

**Qué funcionó bien:**
${learning.whatWorked.map(w => `- ${w}`).join('\n')}

**Qué fue difícil:**
${learning.whatWasDifficult.map(d => `- ${d}`).join('\n')}

**Learning del día:**
${learning.keyInsight}

**Promesas para mañana:**
${learning.promisesForTomorrow.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Métricas Adicionales

- Hora despertar real: [Manual]
- Horas sueño: [Manual]
- Nivel energía (1-10): [Manual]
- Foco mental (1-10): [Manual]

---

*Archivo creado: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}*
*Sistema: PAI Evening Close (auto)*
`;

  await Bun.write(todayFile, content);
  return todayFile;
}

/**
 * Formatear briefing nocturno
 */
function formatEveningBriefing(briefing: EveningBriefing): string {
  const { date, activity, habits, learning, streak, tomorrowPrep } = briefing;

  const dateStr = format(date, 'dd MMMM yyyy', { locale: es });

  let output = `# 🌙 CIERRE DEL DÍA ${dateStr}\n\n`;

  output += `## 📊 Actividad Detectada:\n\n`;
  output += `- **Aplicaciones enviadas:** ${activity.applications}\n`;
  output += `- **Outreach realizado:** ${activity.outreach}\n`;
  output += `- **Posts LinkedIn:** ${activity.posts}\n`;
  output += `- **Commits realizados:** ${activity.commits}\n`;
  output += `- **Archivos trabajados:** ${activity.filesModified.length}\n`;
  output += `- **Horas trabajo estimadas:** ${activity.workDuration.toFixed(1)}h\n\n`;

  output += `## ✅ Hábitos del Día:\n\n`;
  output += `**Score: ${habits.score}/5**\n\n`;
  const habitNames = ['6AM Deporte', 'Palabra=Ley', '0 Alcohol/Tabaco', '2h Founder Flow', '1 Acción Comercial'];
  habits.completed.forEach(h => {
    output += `- ✅ ${habitNames[h - 1]}\n`;
  });

  const missed = [1, 2, 3, 4, 5].filter(h => !habits.completed.includes(h));
  missed.forEach(h => {
    output += `- ❌ ${habitNames[h - 1]}\n`;
  });

  output += `\n## 📚 Learning del Día:\n\n`;

  if (learning.whatWorked.length > 0) {
    output += `**Qué funcionó:**\n`;
    learning.whatWorked.forEach(w => output += `- ${w}\n`);
    output += `\n`;
  }

  if (learning.whatWasDifficult.length > 0) {
    output += `**Qué fue difícil:**\n`;
    learning.whatWasDifficult.forEach(d => output += `- ${d}\n`);
    output += `\n`;
  }

  output += `**Insight clave:** ${learning.keyInsight}\n\n`;

  output += `## 🔥 Racha Actual:\n\n`;
  if (streak > 0) {
    output += `**${streak} días consecutivos** con 5/5 hábitos 🚀\n\n`;
    if (streak >= 7) output += `¡Una semana completa! Imparable.\n\n`;
    if (streak >= 30) output += `¡UN MES COMPLETO! Esto es transformación real.\n\n`;
    if (streak >= 90) output += `¡90 DÍAS! Ya no eres la misma persona.\n\n`;
  } else {
    output += `Racha rota. Mañana empieza de nuevo. La consistencia se construye día a día.\n\n`;
  }

  output += `## 🌅 Preparado para Mañana:\n\n`;
  output += `- **Tipo de día:** ${tomorrowPrep.dayType}\n`;
  output += `- **Foco:** ${tomorrowPrep.focus}\n`;
  output += `- **Agentes pre-configurados:** ${tomorrowPrep.agentsReady}\n\n`;

  output += `**Promesas para mañana:**\n`;
  learning.promisesForTomorrow.forEach((p, i) => {
    output += `${i + 1}. ${p}\n`;
  });

  output += `\n---\n\n`;
  output += `**Tracking guardado en:** \`~/PAI_Habits/${format(date, 'yyyy-MM-dd')}.md\`\n\n`;
  output += `🌙 **Descansa bien. Mañana ejecutamos.**\n`;

  return output;
}

/**
 * MAIN EXECUTION
 */
async function main() {
  console.log('🌙 Iniciando Evening Close...\n');

  // 1. Detectar actividad del día
  console.log('📊 Detectando actividad del día...');
  const activity = await detectDayActivity();
  console.log(`   ✓ ${activity.commits} commits, ${activity.filesModified.length} archivos\n`);

  // 2. Solicitar input de hábitos (simplificado)
  console.log('✅ Hábitos cumplidos hoy:');
  console.log('   (Responde: "todos", "todos menos 2", "1,3,4,5", etc)\n');

  // En una implementación real, aquí iríamos a por input del usuario
  // Por ahora, simulamos con prompt de Bun
  const habitRaw = prompt('Hábitos cumplidos:') || 'todos';
  const habits = parseHabitInput(habitRaw);

  console.log(`   ✓ Score detectado: ${habits.score}/5\n`);

  // 3. Generar learning automático
  console.log('📚 Generando learning del día...');
  const learning = await generateLearning(activity);
  console.log(`   ✓ ${learning.whatWorked.length} victorias, insight generado\n`);

  // 4. Calcular racha
  console.log('🔥 Calculando racha...');
  const streak = await calculateStreak();
  console.log(`   ✓ Racha actual: ${streak} días\n`);

  // 5. Preparar mañana
  console.log('🌅 Preparando configuración para mañana...');
  const tomorrowPrep = prepareTomorrow();
  console.log(`   ✓ ${tomorrowPrep.agentsReady} agentes listos para ${tomorrowPrep.dayType}\n`);

  // 6. Guardar tracking
  const trackingFile = await saveHabitTracking(habits, learning);
  console.log(`✅ Tracking guardado: ${trackingFile}\n`);

  // 7. Generar briefing final
  const briefing: EveningBriefing = {
    date: new Date(),
    activity,
    habits,
    learning,
    streak,
    tomorrowPrep
  };

  const output = formatEveningBriefing(briefing);

  // 8. Guardar briefing nocturno
  const today = format(new Date(), 'yyyy-MM-dd');
  const outputDir = `${process.env.HOME}/PAI_Output/${today}`;
  await $`mkdir -p ${outputDir}`;
  await Bun.write(`${outputDir}/evening-briefing.md`, output);

  // 9. Output para MARC
  console.log(output);
  console.log(`\n✅ Briefing guardado en: ${outputDir}/evening-briefing.md`);

  return briefing;
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main, detectDayActivity, parseHabitInput, generateLearning, calculateStreak };

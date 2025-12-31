#!/usr/bin/env bun
/**
 * Week Review Workflow
 * Análisis semanal automático - tendencias, insights, ajustes para próxima semana
 */

import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { $ } from 'bun';

interface DayData {
  date: Date;
  score: number; // 0-5
  habits: number[]; // array de hábitos cumplidos
  notes: string;
  hasData: boolean;
}

interface WeekStats {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  totalScore: number; // suma de scores
  maxScore: number; // 35 (7 días * 5 hábitos)
  percentage: number; // % cumplimiento
  perfectDays: number; // días con 5/5
  failedDays: number; // días con 0-2/5
  currentStreak: number; // racha de días perfectos
  habitBreakdown: {
    [key: number]: number; // habitNum: diasCumplidos
  };
  days: DayData[];
}

interface WeekInsights {
  strengths: string[];
  weaknesses: string[];
  patterns: string[];
  recommendations: string[];
}

interface WeeklyReport {
  stats: WeekStats;
  insights: WeekInsights;
  comparison: {
    lastWeek?: WeekStats;
    trend: 'up' | 'down' | 'stable';
  };
}

/**
 * Leer datos de un día específico
 */
async function readDayData(date: Date): Promise<DayData> {
  const habitsDir = `${process.env.HOME}/PAI_Habits`;
  const dateStr = format(date, 'yyyy-MM-dd');
  const filePath = `${habitsDir}/${dateStr}.md`;

  let dayData: DayData = {
    date,
    score: 0,
    habits: [],
    notes: '',
    hasData: false
  };

  try {
    const content = await Bun.file(filePath).text();
    dayData.hasData = true;

    // Parsear score
    const scoreMatch = content.match(/\*\*Score:\*\*\s*(\d+)\/5/);
    if (scoreMatch) {
      dayData.score = parseInt(scoreMatch[1]);
    }

    // Parsear hábitos cumplidos (checkboxes marcadas)
    const habitMatches = content.matchAll(/- \[x\] (\d+)\./gi);
    for (const match of habitMatches) {
      dayData.habits.push(parseInt(match[1]));
    }

    // Extraer notas relevantes
    const learningMatch = content.match(/\*\*Learning del día:\*\*\s*(.+)/);
    if (learningMatch) {
      dayData.notes = learningMatch[1].trim();
    }

  } catch (e) {
    // No existe archivo para este día
    dayData.hasData = false;
  }

  return dayData;
}

/**
 * Calcular estadísticas de la semana
 */
async function calculateWeekStats(weekStart: Date): Promise<WeekStats> {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // semana empieza lunes
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekNumber = parseInt(format(weekStart, 'I'));
  const year = weekStart.getFullYear();

  let stats: WeekStats = {
    weekNumber,
    year,
    startDate: weekStart,
    endDate: weekEnd,
    totalScore: 0,
    maxScore: 35, // 7 días * 5 hábitos
    percentage: 0,
    perfectDays: 0,
    failedDays: 0,
    currentStreak: 0,
    habitBreakdown: {
      1: 0, // 6AM Deporte
      2: 0, // Palabra = Ley
      3: 0, // 0 Alcohol/Tabaco
      4: 0, // 2h Founder Flow
      5: 0  // 1 Acción Comercial
    },
    days: []
  };

  // Leer datos de cada día
  for (const day of days) {
    const dayData = await readDayData(day);
    stats.days.push(dayData);

    if (dayData.hasData) {
      stats.totalScore += dayData.score;

      if (dayData.score === 5) {
        stats.perfectDays++;
        stats.currentStreak++; // se resetea si hay día imperfecto
      } else {
        stats.currentStreak = 0;
      }

      if (dayData.score <= 2) {
        stats.failedDays++;
      }

      // Contar cada hábito
      dayData.habits.forEach(h => {
        if (stats.habitBreakdown[h] !== undefined) {
          stats.habitBreakdown[h]++;
        }
      });
    }
  }

  stats.percentage = (stats.totalScore / stats.maxScore) * 100;

  return stats;
}

/**
 * Generar insights de la semana
 */
function generateInsights(stats: WeekStats, lastWeek?: WeekStats): WeekInsights {
  const insights: WeekInsights = {
    strengths: [],
    weaknesses: [],
    patterns: [],
    recommendations: []
  };

  // Análisis de fortalezas
  if (stats.percentage >= 90) {
    insights.strengths.push('Semana casi perfecta - consistencia excepcional');
  } else if (stats.percentage >= 80) {
    insights.strengths.push('Muy buena semana - por encima del target');
  }

  if (stats.perfectDays >= 5) {
    insights.strengths.push(`${stats.perfectDays}/7 días perfectos - excelente racha`);
  }

  // Identificar hábito más fuerte
  const strongestHabit = Object.entries(stats.habitBreakdown)
    .reduce((max, [habit, count]) => count > max.count ? { habit, count } : max, { habit: '0', count: 0 });

  if (strongestHabit.count === 7) {
    const habitNames = ['', '6AM Deporte', 'Palabra=Ley', '0 Alcohol/Tabaco', '2h Founder Flow', '1 Acción Comercial'];
    insights.strengths.push(`Hábito ${strongestHabit.habit} (${habitNames[parseInt(strongestHabit.habit)]}) - 7/7 días perfecto`);
  }

  // Análisis de debilidades
  if (stats.failedDays > 2) {
    insights.weaknesses.push(`${stats.failedDays} días con score bajo (≤2/5) - revisar estructura`);
  }

  // Identificar hábito más débil
  const weakestHabit = Object.entries(stats.habitBreakdown)
    .reduce((min, [habit, count]) => count < min.count ? { habit, count } : min, { habit: '1', count: 7 });

  if (weakestHabit.count < 5) {
    const habitNames = ['', '6AM Deporte', 'Palabra=Ley', '0 Alcohol/Tabaco', '2h Founder Flow', '1 Acción Comercial'];
    insights.weaknesses.push(`Hábito ${weakestHabit.habit} (${habitNames[parseInt(weakestHabit.habit)]}) solo ${weakestHabit.count}/7 días - necesita foco`);
  }

  // Detectar patrones en días de la semana
  const weekendScore = stats.days.slice(5, 7).reduce((sum, d) => sum + d.score, 0); // sáb + dom
  const weekdayScore = stats.days.slice(0, 5).reduce((sum, d) => sum + d.score, 0); // lun-vie

  if (weekendScore < weekdayScore * 0.6) {
    insights.patterns.push('Fin de semana más difícil - considerar estructura especial');
  }

  if (weekdayScore / 5 > 4.5) {
    insights.patterns.push('Entre semana excelente - rutina diaria funciona');
  }

  // Comparación con semana anterior
  if (lastWeek) {
    const improvement = stats.percentage - lastWeek.percentage;

    if (improvement > 10) {
      insights.patterns.push(`+${improvement.toFixed(0)}% vs semana pasada - momentum ascendente`);
    } else if (improvement < -10) {
      insights.patterns.push(`${improvement.toFixed(0)}% vs semana pasada - revisar qué cambió`);
    }
  }

  // Recomendaciones basadas en análisis
  if (weakestHabit.count < 5) {
    insights.recommendations.push(`Foco en hábito ${weakestHabit.habit} próxima semana - crear trigger específico`);
  }

  if (stats.failedDays > 0) {
    insights.recommendations.push('Identificar qué sucede en días de bajo score - reducir variables');
  }

  if (stats.percentage < 80) {
    insights.recommendations.push('Target: 80%+ la próxima semana - simplificar compromisos si es necesario');
  } else if (stats.percentage >= 90) {
    insights.recommendations.push('Mantener este nivel - ya estás en el top 1% de consistencia');
  }

  return insights;
}

/**
 * Formatear reporte semanal
 */
function formatWeeklyReport(report: WeeklyReport): string {
  const { stats, insights, comparison } = report;

  const weekStr = `Semana ${stats.weekNumber} de ${stats.year}`;
  const dateRange = `${format(stats.startDate, 'dd MMM', { locale: es })} - ${format(stats.endDate, 'dd MMM', { locale: es })}`;

  let output = `# 📊 REPORTE SEMANAL\n\n`;
  output += `**${weekStr}** (${dateRange})\n\n`;

  output += `## 🎯 Métricas Clave:\n\n`;
  output += `- **Score total:** ${stats.totalScore}/${stats.maxScore} (${stats.percentage.toFixed(1)}%)\n`;
  output += `- **Días perfectos (5/5):** ${stats.perfectDays}/7\n`;
  output += `- **Días difíciles (≤2/5):** ${stats.failedDays}/7\n`;
  output += `- **Racha actual:** ${stats.currentStreak} días\n\n`;

  // Tabla día a día
  output += `## 📅 Desglose Diario:\n\n`;
  output += `| Día | Fecha | Score | Hábitos Cumplidos |\n`;
  output += `|-----|-------|-------|-------------------|\n`;

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  stats.days.forEach((day, i) => {
    const dateStr = format(day.date, 'dd/MM');
    const scoreIcon = day.score === 5 ? '🟢' : day.score >= 3 ? '🟡' : '🔴';
    const habitsStr = day.hasData ? day.habits.join(',') : '-';
    output += `| ${dayNames[i]} | ${dateStr} | ${scoreIcon} ${day.score}/5 | ${habitsStr} |\n`;
  });

  output += `\n## 💪 Desglose por Hábito:\n\n`;
  const habitNames = [
    '6:00 AM Deporte',
    'Palabra = Ley',
    '0 Alcohol, 0 Tabaco',
    '2h Founder Flow',
    '1 Acción Comercial'
  ];

  Object.entries(stats.habitBreakdown).forEach(([habitNum, count]) => {
    const percentage = (count / 7) * 100;
    const bar = '█'.repeat(Math.floor(count)) + '░'.repeat(7 - count);
    output += `**${habitNum}. ${habitNames[parseInt(habitNum) - 1]}**\n`;
    output += `${bar} ${count}/7 días (${percentage.toFixed(0)}%)\n\n`;
  });

  // Insights
  output += `## 💡 Insights de la Semana:\n\n`;

  if (insights.strengths.length > 0) {
    output += `**✅ Fortalezas:**\n`;
    insights.strengths.forEach(s => output += `- ${s}\n`);
    output += `\n`;
  }

  if (insights.weaknesses.length > 0) {
    output += `**⚠️  Áreas de Mejora:**\n`;
    insights.weaknesses.forEach(w => output += `- ${w}\n`);
    output += `\n`;
  }

  if (insights.patterns.length > 0) {
    output += `**📈 Patrones Detectados:**\n`;
    insights.patterns.forEach(p => output += `- ${p}\n`);
    output += `\n`;
  }

  // Recomendaciones
  output += `## 🎯 Plan para Próxima Semana:\n\n`;
  insights.recommendations.forEach((r, i) => {
    output += `${i + 1}. ${r}\n`;
  });

  // Comparación con semana anterior
  if (comparison.lastWeek) {
    output += `\n## 📊 Comparación:\n\n`;
    output += `| Métrica | Semana Anterior | Esta Semana | Cambio |\n`;
    output += `|---------|----------------|-------------|--------|\n`;

    const scoreDiff = stats.totalScore - comparison.lastWeek.totalScore;
    const scoreDiffStr = scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`;

    const pctDiff = stats.percentage - comparison.lastWeek.percentage;
    const pctDiffStr = pctDiff > 0 ? `+${pctDiff.toFixed(1)}%` : `${pctDiff.toFixed(1)}%`;

    output += `| Score | ${comparison.lastWeek.totalScore}/35 | ${stats.totalScore}/35 | ${scoreDiffStr} |\n`;
    output += `| % | ${comparison.lastWeek.percentage.toFixed(1)}% | ${stats.percentage.toFixed(1)}% | ${pctDiffStr} |\n`;
    output += `| Días 5/5 | ${comparison.lastWeek.perfectDays} | ${stats.perfectDays} | ${stats.perfectDays - comparison.lastWeek.perfectDays} |\n`;

    const trendIcon = comparison.trend === 'up' ? '📈' : comparison.trend === 'down' ? '📉' : '➡️';
    output += `\n**Tendencia:** ${trendIcon} ${comparison.trend === 'up' ? 'Mejorando' : comparison.trend === 'down' ? 'Decayendo' : 'Estable'}\n`;
  }

  output += `\n---\n\n`;
  output += `**Reporte generado:** ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: es })}\n`;
  output += `**Sistema:** PAI Week Review (auto)\n`;

  return output;
}

/**
 * MAIN EXECUTION
 */
async function main() {
  console.log('📊 Iniciando Week Review...\n');

  // 1. Calcular estadísticas de esta semana
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  console.log(`📅 Analizando semana ${format(thisWeekStart, 'dd MMM', { locale: es })} - ${format(endOfWeek(thisWeekStart, { weekStartsOn: 1 }), 'dd MMM', { locale: es })}...\n`);

  const thisWeekStats = await calculateWeekStats(thisWeekStart);

  // 2. Calcular estadísticas de semana anterior (para comparación)
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekStats = await calculateWeekStats(lastWeekStart);

  // 3. Determinar tendencia
  const trend: 'up' | 'down' | 'stable' =
    thisWeekStats.percentage > lastWeekStats.percentage + 5 ? 'up' :
    thisWeekStats.percentage < lastWeekStats.percentage - 5 ? 'down' :
    'stable';

  // 4. Generar insights
  console.log('💡 Generando insights...');
  const insights = generateInsights(thisWeekStats, lastWeekStats);

  // 5. Construir reporte
  const report: WeeklyReport = {
    stats: thisWeekStats,
    insights,
    comparison: {
      lastWeek: lastWeekStats,
      trend
    }
  };

  // 6. Formatear output
  const output = formatWeeklyReport(report);

  // 7. Guardar reporte
  const habitsDir = `${process.env.HOME}/PAI_Habits`;
  const weeklyDir = `${habitsDir}/weekly-reviews`;
  await $`mkdir -p ${weeklyDir}`;

  const reportFile = `${weeklyDir}/${thisWeekStats.year}-W${String(thisWeekStats.weekNumber).padStart(2, '0')}.md`;
  await Bun.write(reportFile, output);

  console.log(output);
  console.log(`\n✅ Reporte guardado en: ${reportFile}`);

  return report;
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main, calculateWeekStats, generateInsights };

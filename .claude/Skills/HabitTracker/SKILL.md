---
name: habit-tracker
description: Sistema de tracking de los 5 keystone habits de Marc. USE WHEN usuario quiere trackear hábitos diarios, revisar progreso semanal, generar reportes de consistencia, o analizar patrones de cumplimiento. Automatiza el registro y análisis de hábitos inquebrantables.
---

# Habit Tracker - Sistema de Hábitos Inquebrantables

## Overview

Sistema diseñado específicamente para trackear y analizar los 5 Keystone Habits de Marc Bau en su plan 2026.

## Los 5 Keystone Habits

1. **6:00 AM Deporte** - Gym o entrenamiento (no-negociable)
2. **Palabra = Ley** - Cumplir todas las promesas del día
3. **0 Alcohol, 0 Tabaco** - Racha continua sin sustancias
4. **2h Founder Flow Diario** - Deep work antes de cualquier empleo
5. **1 Acción Comercial Diaria** - Email, propuesta, follow-up, o post LinkedIn

## Workflows

### 1. Track Today (`track-today`)

**Uso:** Al final del día, registrar hábitos cumplidos

**Trigger:** "trackea mis hábitos de hoy", "registrar hábitos día"

**Ejecuta:**
```bash
~/.claude/Skills/HabitTracker/workflows/track-today.sh
```

**Qué hace:**
- Crea archivo markdown para hoy en `~/PAI_Habits/YYYY-MM-DD.md`
- Template con checkboxes para los 5 hábitos
- Espacio para notas y learnings
- Calcula score del día (X/5)

### 2. Weekly Review (`weekly-review`)

**Uso:** Cada domingo, analizar semana completa

**Trigger:** "review semanal de hábitos", "cómo fue mi semana"

**Ejecuta:**
```bash
~/.claude/Skills/HabitTracker/workflows/weekly-review.sh
```

**Qué hace:**
- Lee los 7 archivos de la semana
- Genera tabla de cumplimiento
- Identifica patrones (qué días/hábitos más difíciles)
- Calcula racha actual
- Sugiere ajustes para próxima semana

### 3. Monthly Report (`monthly-report`)

**Uso:** Para Personal Board Meeting mensual

**Trigger:** "reporte mensual hábitos", "estadísticas del mes"

**Qué hace:**
- Analiza 30 días de datos
- Genera gráfico de progreso
- Calcula racha sin romper más larga
- Identifica tendencias
- Exporta para Personal Board Meeting

### 4. Streak Check (`streak-check`)

**Uso:** Ver racha actual sin romper

**Trigger:** "cuál es mi racha", "días consecutivos"

**Qué hace:**
- Cuenta días consecutivos con 5/5 hábitos
- Muestra última vez que rompiste racha
- Motiva a continuar

## File Structure

```
~/PAI_Habits/
├── 2026-01-01.md
├── 2026-01-02.md
├── ...
├── weekly-reviews/
│   ├── 2026-W01.md
│   └── 2026-W02.md
└── monthly-reports/
    ├── 2026-01.md
    └── 2026-02.md
```

## Daily Template Format

```markdown
# Hábitos - [Fecha]

## Keystone Habits Checklist

- [ ] 1. 6:00 AM Deporte (Gym/Entrenamiento)
- [ ] 2. Palabra = Ley (Todas promesas cumplidas)
- [ ] 3. 0 Alcohol, 0 Tabaco
- [ ] 4. 2h Founder Flow Diario
- [ ] 5. 1 Acción Comercial Diaria

**Score:** ___/5

## Notas del Día

**Qué funcionó bien:**
-

**Qué fue difícil:**
-

**Learning del día:**
-

**Promesas para mañana:**
1.
2.
3.

## Métricas Adicionales

- Hora despertar real:
- Horas sueño:
- Nivel energía (1-10):
- Foco mental (1-10):
```

## Integration with PAI

Este skill se integra con:
- **History System** - Learnings se guardan automáticamente
- **CORE** - Reportes siguen formato PAI
- **Observability** - Tracking visible en dashboard

## Commands Reference

```bash
# Trackear hoy
MARC, trackea mis hábitos de hoy

# Review semanal
MARC, dame mi review semanal de hábitos

# Reporte mensual
MARC, genera reporte mensual para mi Personal Board Meeting

# Ver racha
MARC, cuál es mi racha actual de hábitos

# Análisis profundo
MARC, analiza mis patrones de hábitos y dame insights
```

## Success Metrics

**Target 2026:**
- Q1: 80/90 días perfectos (88% consistencia)
- Q2: 85/91 días perfectos (93% consistencia)
- Q3: 87/92 días perfectos (95% consistencia)
- Q4: 90/92 días perfectos (98% consistencia)

**Racha Goal:**
- 365 días consecutivos sin romper = TRANSFORMACIÓN TOTAL

## Why This Matters

Tu autoestima depende de promesas cumplidas. Cada hábito cumplido = +1 poder interno. Cada hábito roto = -10 poder interno.

El sistema hace visible lo invisible. Lo que se mide, se mejora.

---

**Autor:** Sistema PAI personalizado para Marc Bau
**Última actualización:** 31 Diciembre 2025

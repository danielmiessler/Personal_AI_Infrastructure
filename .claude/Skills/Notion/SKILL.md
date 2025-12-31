---
name: notion
description: Gestión completa de Notion workspace - tracking visual de PAI. USE WHEN usuario pide "crear databases notion", "sincronizar notion", "ver en notion", "dashboard visual" OR quiere tracking visual de hábitos, metas, progreso. Crea databases, actualiza páginas, busca contenido.
---

# Notion - Sistema Visual de Tracking PAI

## Overview

Integración completa con Notion para tracking visual de todo tu sistema PAI:
- **Hábitos diarios** con heatmaps y rachas
- **Progreso semanal** con gráficos de tendencia
- **Metas 2026** con progress bars automáticos
- **Sincronización automática** desde /morning y /evening

## Workflows

### 1. Setup Completo (`setup-notion`)

**Trigger:** "configura notion", "monta notion", "crea databases notion"

**Qué hace:**
```typescript
1. Verifica conexión MCP con Notion
2. Busca workspace disponible
3. Crea página principal "PAI 2026 Dashboard"
4. Crea 3 databases dentro:
   - Daily Tracking
   - Weekly Reviews
   - 2026 Goals
5. Configura todas las propiedades
6. Crea vistas (Timeline, Calendar, Table, etc.)
7. Guarda Database IDs en config
8. Retorna URLs para acceder
```

**Output:**
```
✅ Notion configurado correctamente

Databases creadas:
📅 Daily Tracking: https://notion.so/...
📈 Weekly Reviews: https://notion.so/...
🎯 2026 Goals: https://notion.so/...

Próximo paso: Ejecuta /morning mañana y verás la primera entrada automática
```

### 2. Sincronización Diaria (`sync-daily`)

**Trigger:** Automático desde /morning y /evening

**Morning:**
- Crea entrada "Planned" para hoy
- Marca tipo de día (PAR/IMPAR)
- Inicializa hábitos en false
- Status: "In Progress"

**Evening:**
- Actualiza entrada del día
- Marca hábitos cumplidos (checkboxes)
- Añade actividad (apps, outreach, posts, commits)
- Escribe learning del día
- Calcula y muestra racha
- Status: "Complete"

### 3. Review Semanal (`sync-weekly`)

**Trigger:** Automático desde /weekreview (domingos)

**Qué hace:**
- Lee 7 días de Daily Tracking
- Calcula métricas agregadas
- Identifica hábito más fuerte/débil
- Compara con semana anterior
- Detecta tendencia (↗️/→/↘️)
- Genera insights y recomendaciones
- Crea entrada en Weekly Reviews database

### 4. Actualización de Metas (`update-goals`)

**Trigger:** Automático después de sync-daily

**Qué hace:**
- Notion auto-calcula rollups desde Daily Tracking
- Actualiza contadores de progreso
- Marca status (On Track / At Risk / Behind)
- Calcula % completion

### 5. Búsqueda (`search`)

**Trigger:** "busca en notion", "encuentra en notion"

**Qué hace:**
- Busca páginas y contenido en Notion
- Filtra por database, fecha, propiedades
- Retorna resultados formateados

## Databases Creadas

### Daily Tracking

**Propiedades:**
```
Fecha (Title)           - Título de la entrada
Date (Date)             - Fecha del día
Tipo Día (Select)       - PAR / IMPAR
Status (Status)         - Planned / In Progress / Complete

Hábitos:
- Hábito 1: Gym (Checkbox)
- Hábito 2: Palabra=Ley (Checkbox)
- Hábito 3: 0 Alcohol/Tabaco (Checkbox)
- Hábito 4: Founder Flow (Checkbox)
- Hábito 5: Acción Comercial (Checkbox)
Hábitos Score (Number) - 0-5 calculado

Actividad:
- Aplicaciones (Number)
- Outreach (Number)
- Posts LinkedIn (Number)
- Commits (Number)

Learning del Día (Text)
Racha (Number)         - Días perfectos consecutivos
```

**Vistas:**
- Timeline - Progreso mensual
- Calendar - Grid visual con scores
- Table - Detalles completos
- Gallery - Cards con learnings

### Weekly Reviews

**Propiedades:**
```
Semana (Title)              - "Semana X - 2026"
Fecha Inicio (Date)
Rango (Text)                - "dd MMM - dd MMM"
Score Total (Number)        - /35
Porcentaje (Formula)        - (Score / 35) * 100
Días Perfectos (Number)     - Días con 5/5

Hábito Más Fuerte (Select)  - 1-5
Hábito Más Débil (Select)   - 1-5
Tendencia (Select)          - ↗️ / → / ↘️

Rollups desde Daily:
- Aplicaciones Total (Rollup)
- Outreach Total (Rollup)
- Posts Total (Rollup)

Insights (Text)
Recomendaciones (Text)
```

**Vistas:**
- Table + Chart - Tendencia semanal
- Board - Por tendencia

### 2026 Goals

**Propiedades:**
```
Goal (Title)           - Nombre del objetivo
Quarter (Select)       - Q1 / Q2 / Q3 / Q4
Category (Select)      - Trabajo / Consultoría / Contenido / Hábitos
Target (Number)        - Meta numérica
Current (Rollup)       - Progreso actual desde Daily
Progress (Formula)     - (Current / Target) * 100
Status (Status)        - On Track / At Risk / Behind
Last Updated (Last Edited Time)
```

**Vistas:**
- Board - Por Quarter
- Progress Bars - % visual
- Timeline - Roadmap 2026

## Comandos Disponibles

```bash
# Setup inicial (una vez)
MARC, configura Notion para PAI
MARC, crea las databases de Notion

# Sincronización manual (normalmente automática)
MARC, sincroniza hoy con Notion
MARC, actualiza Notion con los datos de hoy

# Búsqueda
MARC, busca "keyword" en Notion
MARC, muéstrame mis últimas entradas en Notion

# Verificación
MARC, verifica conexión con Notion
MARC, lista mis databases de Notion
```

## Flujo Automático

```
Morning (/morning)
    ↓
Crea entrada "Planned" en Notion Daily Tracking
    ↓
[Trabajas durante el día]
    ↓
Evening (/evening)
    ↓
Actualiza entrada con hábitos + actividad
    ↓
Marca como "Complete"
    ↓
Si es Domingo → Crea Weekly Review
    ↓
Goals se actualizan automáticamente (rollup)
```

## Configuración

**Archivo:** `~/.config/pai/notion-config.json`

```json
{
  "databaseIds": {
    "dailyTracking": "xxx",
    "weeklyReviews": "xxx",
    "goals2026": "xxx"
  },
  "dashboardPageId": "xxx",
  "autoSync": {
    "morning": true,
    "evening": true,
    "weeklyReview": true
  }
}
```

## Mobile App

Con Notion Mobile puedes:
- ✅ Ver tu briefing matutino mientras desayunas
- ✅ Marcar hábitos según los cumples durante el día
- ✅ Ver tu score y racha en tiempo real
- ✅ Revisar weekly reviews los domingos
- ✅ Compartir progreso con accountability partners

## Visualización

**Heatmap de Hábitos (ejemplo):**
```
        L  M  M  J  V  S  D
Gym     🟢 🟢 🟢 🟢 🟢 🟢 🟢
Palabra 🟢 🟢 🟡 🟢 🟢 🟢 🟢
...
```

**Progress Bars (ejemplo):**
```
100 Aplicaciones Q1
████████░░░░░░░░  45/100 (45%) ✅ On Track
```

## Troubleshooting

**"Notion MCP not connected"**
- Verifica que NOTION_API_KEY esté en .mcp.json
- Reinicia Claude Code para cargar MCP server

**"Database not found"**
- Ejecuta workflow setup-notion primero
- Verifica que compartiste las páginas con la integración

**"Unauthorized"**
- Verifica que el token empiece con ntn_
- Crea la integración en notion.so/my-integrations
- Dale permisos de Read/Write/Insert

---

**Autor:** Sistema PAI - Marc Bau 2026
**Versión:** 1.0 - Integración Visual Completa

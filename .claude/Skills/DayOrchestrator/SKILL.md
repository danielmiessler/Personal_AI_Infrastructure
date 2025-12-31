---
name: day-orchestrator
description: Sistema automatizado de orquestación diaria para Marc. USE WHEN usuario dice "morning", "comenzar día", "empezar jornada", "evening", "terminar día", "cerrar jornada", OR quiere workflow automático completo sin comandos manuales. Lanza agentes paralelos, determina tareas del día, y coordina todos los sistemas.
---

# Day Orchestrator - Tu Piloto Automático 2026

## Overview

Reduce de 20+ comandos diarios a solo **2 comandos**:
- `/morning` - Dispara workflow completo matutino
- `/evening` - Cierra día con tracking automático

El orquestador decide qué hacer, lanza agentes paralelos, y coordina todo el sistema.

## Workflows

### 1. Morning Launch (`/morning`)

**Trigger:** "morning", "comenzar día", "empezar jornada", "buenos días MARC"

**Qué hace automáticamente:**

```typescript
1. Detecta fecha y día de semana
2. Determina tipo de día (par/impar, lunes-domingo)
3. Lanza agentes paralelos según el día:

   DÍA PAR (Aplicaciones trabajo):
   - Agent 1: Research 5 empresas target
   - Agent 2: Preparar plantillas CV personalizadas
   - Agent 3: Analizar 5 job postings con Fabric
   - Agent 4: Generar 5 cartas motivación con AlexHormozi
   - Spotcheck: Verificar calidad

   DÍA IMPAR (Outreach consultoría):
   - Agent 1: Research 10 empresas mid-market
   - Agent 2: Identificar pain points IA en cada una
   - Agent 3: Generar 10 propuestas personalizadas
   - Agent 4: Crear emails con templates
   - Spotcheck: Verificar personalización

   MARTES/JUEVES (+ Contenido LinkedIn):
   - Agent 5: Generar 2 ideas posts
   - Agent 6: Crear visuales con Art skill
   - Spotcheck: Verificar calidad contenido

4. Genera briefing personalizado del día
5. Crea checklist ejecutable
6. Abre archivos necesarios para el día
```

**Output:**
```markdown
# 🌅 BRIEFING DÍA [FECHA]

## Tipo de Día: [PAR/IMPAR - DÍA SEMANA]

## Agentes Lanzados (en paralelo):
✅ Agent 1: [tarea] - COMPLETADO
✅ Agent 2: [tarea] - COMPLETADO
✅ Agent 3: [tarea] - COMPLETADO
✅ Spotcheck: Calidad verificada

## Tu Trabajo Hoy:
1. [ ] Revisar resultados de agentes
2. [ ] Personalizar finales si necesario
3. [ ] Enviar [X] aplicaciones/propuestas
4. [ ] [Tarea específica del día]

## Archivos Preparados:
- [Lista de archivos generados]

## Recordatorios:
- Hábito 1: 6:00 AM Gym ✅ (ya hecho)
- Hábito 2-5: Pendientes de completar

## Meta del Día:
[Métrica específica según día]

---
🔥 Todo listo. Solo ejecuta el checklist.
```

### 2. Evening Close (`/evening`)

**Trigger:** "evening", "terminar día", "cerrar jornada", "buenas noches MARC"

**Qué hace automáticamente:**

```typescript
1. Lee actividad del día desde:
   - Git commits (qué trabajaste)
   - Archivos creados/modificados
   - Historial de comandos
   - Collar lifelog si hay transcript

2. Pregunta confirmación hábitos (1 pregunta):
   "¿Qué hábitos cumpliste hoy? [lista 1-5]"

   Input simplificado:
   - Por voz: "todos" / "todos menos 2" / "1,3,4,5"
   - Por texto: números o checkmarks

3. Genera tracking automático:
   - Crea archivo PAI_Habits/YYYY-MM-DD.md
   - Rellena con actividad detectada
   - Marca hábitos según input
   - Calcula score día

4. Identifica learnings del día:
   - Analiza qué funcionó
   - Qué fue difícil
   - Extrae insight clave

5. Prepara mañana:
   - Determina tipo día siguiente
   - Sugiere prioridades
   - Genera checklist preliminar

6. Actualiza métricas:
   - Suma a totales semanales
   - Calcula racha actual
   - Alerta si meta en riesgo
```

**Output:**
```markdown
# 🌙 CIERRE DÍA [FECHA]

## Actividad Detectada Hoy:
- [X] aplicaciones enviadas
- [X] propuestas creadas
- [X] posts LinkedIn
- [X] archivos trabajados

## Hábitos:
✅ 1. 6:00 AM Gym
✅ 2. Palabra = Ley (promesas cumplidas: [lista])
✅ 3. 0 alcohol, 0 tabaco
✅ 4. 2h Founder Flow (7:00-9:00)
✅ 5. Acción comercial ([específico])

**Score:** 5/5 ⭐

## Learning del Día:
[Insight automático extraído]

## Racha Actual:
[X] días perfectos consecutivos 🔥

## Plan Mañana:
Día [PAR/IMPAR] - [DÍA SEMANA]
Foco: [Aplicaciones/Outreach]
Agentes pre-configurados: Listos

---
💤 Buen trabajo. Descansa.
```

### 3. Week Review (`/weekreview`)

**Trigger:** Domingo, automático si dices "review semanal"

**Qué hace:**
```typescript
1. Agrega últimos 7 días de tracking
2. Calcula métricas automáticas:
   - Hábitos: X/35
   - Aplicaciones: total
   - Outreach: total
   - Propuestas: total
   - Ingresos: €X

3. Identifica patterns:
   - Qué días fueron perfectos
   - Qué hábitos más difíciles
   - Qué actividades más productivas

4. Genera recomendaciones:
   - Ajustes para próxima semana
   - Sistemas a optimizar
   - Habits en riesgo

5. Prepara Personal Board Meeting si fin de mes
```

### 4. Voice Capture (`/capture`)

**Trigger:** "captura lo que voy a decir", "registra esto"

**Integración con tu collar:**
```typescript
1. Escucha input de voz (Whisper Flow)
2. Transcribe automáticamente
3. Identifica tipo de contenido:
   - Hábito cumplido → Registra
   - Tarea completada → Trackea
   - Idea → Guarda en PAI_Ideas/
   - Learning → Guarda en History/
   - Promesa → Añade a checklist día

4. Confirma registro:
   "✅ Registrado: [resumen]"
```

## Agent Orchestration

El sistema usa **modelo correcto para cada tarea**:

```typescript
// Research rápido
agents.research({ model: 'haiku' })  // 10x más rápido

// Propuestas complejas
agents.pitch({ model: 'sonnet' })    // Balance

// Estrategia profunda
agents.strategy({ model: 'opus' })   // Máxima inteligencia
```

**Lanzamiento paralelo:**
```typescript
// CORRECTO - Todos a la vez
await Promise.all([
  agent1.research(),
  agent2.analyze(),
  agent3.create(),
  agent4.verify()
])

// Output: 4 tareas en tiempo de 1
```

## Smart Defaults

El sistema **asume y pregunta solo cuando necesario**:

```markdown
❌ ANTES:
MARC, usa Research para investigar empresa X
MARC, ahora usa Fabric para analizar
MARC, ahora usa AlexHormozi para propuesta
MARC, ahora usa Art para visual
MARC, ahora dame todo junto
(5 comandos, 10 minutos)

✅ AHORA:
/morning
(1 comando, todo automático en 2 minutos)
```

## Integration Points

**Con otros sistemas:**
- **HabitTracker:** Lee/escribe automáticamente
- **Research:** Lanza en paralelo según día
- **AlexHormozi:** Genera propuestas automáticas
- **Art:** Crea visuales sin preguntar
- **Fabric:** Analiza contenido detectado
- **History:** Guarda learnings automáticos
- **Lifelog:** Procesa transcripts del collar

## Error Handling

```typescript
if (agente_falla) {
  reintentar_con_modelo_superior()
  if (sigue_fallando) {
    notificar_usuario_con_contexto()
    ofrecer_alternativa()
  }
}
```

## Configuration

Archivo: `~/.config/pai/day-orchestrator.json`

```json
{
  "morning": {
    "auto_launch_agents": true,
    "parallel_limit": 5,
    "model_default": "haiku",
    "use_voice_briefing": true
  },
  "evening": {
    "auto_detect_activity": true,
    "require_habit_confirmation": true,
    "voice_input_enabled": true,
    "auto_prepare_tomorrow": true
  },
  "week_review": {
    "auto_trigger_sunday": true,
    "generate_board_meeting": "last_sunday_month"
  }
}
```

## Usage Examples

**Mañana típica:**
```
Tú: /morning

MARC: 🌅 Buenos días Marc. Es martes 7 de enero (día impar).

Lanzando workflow de outreach + contenido...

✅ Agent 1: Investigando 10 empresas mid-market (2min)
✅ Agent 2: Identificando pain points IA (2min)
✅ Agent 3: Generando 10 propuestas personalizadas (3min)
✅ Agent 4: Creando emails con templates (1min)
✅ Agent 5: Generando 2 ideas posts LinkedIn (2min)
✅ Agent 6: Creando visuales posts (1min)
✅ Spotcheck: Calidad verificada ✓

Todo listo en 3 minutos (paralelo).

Tu trabajo ahora:
1. Revisar 10 propuestas en ~/PAI_Output/2026-01-07/
2. Personalizar finales si quieres
3. Copiar/pegar y enviar
4. Revisar 2 posts LinkedIn preparados
5. Publicar

Archivos: [links]

🔥 Vas por 7 días perfectos. No rompas la racha.
```

**Noche típica:**
```
Tú: /evening (o por voz: "MARC, cerrar día")

MARC: 🌙 Cerrando día 7 de enero...

Actividad detectada:
- 12 emails outreach enviados ✓
- 3 propuestas creadas ✓
- 2 posts LinkedIn publicados ✓
- 15 archivos trabajados ✓

Confirma hábitos (di números cumplidos o "todos"):

Tú (voz): "todos menos el 2, rompí una promesa"

MARC:
✅ 1. 6:00 AM Gym
❌ 2. Palabra = Ley (promesa rota: [detectada])
✅ 3. 0 alcohol, 0 tabaco
✅ 4. 2h Founder Flow
✅ 5. Acción comercial (12 outreach)

Score: 4/5

⚠️ Racha rota. Última racha: 7 días.
Nueva racha desde mañana.

Learning: [auto-generado según promesa rota]

Mañana: Día par - Aplicaciones trabajo
Agentes pre-configurados para 5 aplicaciones.

💤 Descansa. Mañana vuelves fuerte.
```

## Benefits

**Ahorro de tiempo diario:**
- Antes: 20-30 comandos, ~45 min interacción
- Ahora: 2 comandos, ~5 min interacción
- **Ahorro: 40 minutos/día = 4.6 horas/semana**

**Ahorro mental:**
- Cero decisiones de "qué hacer ahora"
- Cero tracking manual
- Cero olvidar pasos

**Mejor calidad:**
- Agentes paralelos = más rápido + mejor
- Spotcheck automático = menos errores
- Consistencia garantizada

---

**Autor:** Sistema PAI - Marc Bau 2026
**Versión:** 1.0 - Orquestación Automática

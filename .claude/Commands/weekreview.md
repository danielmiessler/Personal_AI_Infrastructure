---
description: Análisis semanal automático - lee 7 días de hábitos, genera insights, compara con semana anterior, identifica patrones
---

# Week Review - Análisis Semanal Automático

**Ejecuta el workflow `week-review` de la skill `DayOrchestrator`.**

## Qué hace automáticamente:

1. **Lee datos de la semana**:
   - Scores diarios (7 días)
   - Hábitos cumplidos cada día
   - Learnings y notas

2. **Calcula métricas clave**:
   - Score total y porcentaje
   - Días perfectos (5/5)
   - Días difíciles (≤2/5)
   - Racha actual

3. **Desglose por hábito**:
   - Cuántos días cumpliste cada uno
   - Porcentaje individual
   - Identifica más fuerte y más débil

4. **Genera insights**:
   - Fortalezas de la semana
   - Áreas de mejora
   - Patrones detectados (fines de semana, días específicos)

5. **Compara con semana anterior**:
   - Tendencia (subiendo/bajando/estable)
   - Diferencia en métricas
   - Momentum

6. **Recomienda ajustes**:
   - En qué hábito focarte
   - Qué cambiar la próxima semana

## Output esperado:

- Tabla día a día con scores
- Gráfico de barras por hábito
- Lista de insights accionables
- Comparación semana anterior
- Plan para próxima semana

## Cuándo usarlo:

- **Cada domingo por la noche** (recomendado)
- Fin de mes para Personal Board Meeting
- Cuando quieras revisar progreso

## Tiempo:

- **Antes:** 30+ minutos revisando archivos manualmente
- **Ahora:** 1 comando, 5 segundos

## Uso:

```
/weekreview
```

O también:
```
MARC, dame mi review semanal
MARC, cómo fue mi semana
Análisis semanal por favor
```

---

**Sistema:** Day Orchestrator - Automatización completa

---
description: Lanza workflow automático completo para comenzar el día - determina tareas, lanza agentes paralelos, prepara todo lo necesario sin comandos manuales adicionales
---

# Morning Launch - Piloto Automático Matutino

**Ejecuta el workflow `morning-launch` de la skill `DayOrchestrator`.**

## Qué hace automáticamente:

1. **Detecta tipo de día** (par/impar, día semana)
2. **Lanza agentes paralelos** según corresponda:
   - Día par: 5 aplicaciones trabajo preparadas
   - Día impar: 10 outreach consultoría listos
   - Martes/Jueves: + 2 posts LinkedIn generados
3. **Genera briefing personalizado** del día
4. **Prepara archivos** y checklist ejecutable
5. **Te dice exactamente qué hacer** (sin más comandos)

## Output esperado:

- Briefing completo del día
- Agentes completados (research, propuestas, contenido)
- Checklist de ejecución
- Archivos listos en `~/PAI_Output/YYYY-MM-DD/`
- Recordatorios de hábitos

## Tiempo:

- **Antes:** 20+ comandos, 30-45 minutos
- **Ahora:** 1 comando, 2-3 minutos (agentes en paralelo)

## Uso:

```
/morning
```

O también puedes decir:
```
MARC, comenzar día
MARC, morning launch
Buenos días MARC, empecemos
```

---

**Sistema:** Day Orchestrator - Automatización completa

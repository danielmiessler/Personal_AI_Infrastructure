---
description: Cierra el día automáticamente - detecta actividad, trackea hábitos con input mínimo (voz o texto), genera learning, prepara mañana
---

# Evening Close - Piloto Automático Nocturno

**Ejecuta el workflow `evening-close` de la skill `DayOrchestrator`.**

## Qué hace automáticamente:

1. **Detecta actividad del día**:
   - Aplicaciones/outreach enviados
   - Propuestas creadas
   - Contenido publicado
   - Archivos trabajados

2. **Trackea hábitos** con input mínimo:
   - Solo pregunta qué cumpliste
   - Input por voz o texto simple
   - Registra automáticamente

3. **Genera learning** del día:
   - Qué funcionó
   - Qué fue difícil
   - Insight clave

4. **Calcula racha** actual

5. **Prepara mañana**:
   - Tipo de día siguiente
   - Agentes pre-configurados
   - Checklist preliminar

## Input simplificado:

En lugar de marcar cada hábito manualmente, solo di:

```
"todos"           → 5/5 hábitos
"todos menos 2"   → 4/5 (faltó hábito 2)
"1,3,4,5"         → 4/5 (faltó hábito 2)
```

Por voz o por texto, como prefieras.

## Output esperado:

- Resumen actividad día
- Hábitos trackeados (score X/5)
- Learning automático
- Racha actual
- Plan mañana prelisto

## Tiempo:

- **Antes:** 10+ comandos, 15-20 minutos
- **Ahora:** 1 comando + 1 respuesta, 2 minutos

## Uso:

```
/evening
```

O también puedes decir:
```
MARC, cerrar día
MARC, evening close
Buenas noches MARC, terminemos
```

---

**Sistema:** Day Orchestrator - Automatización completa

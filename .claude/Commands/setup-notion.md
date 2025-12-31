---
description: Configura Notion completamente - crea dashboard principal y 3 databases (Daily Tracking, Weekly Reviews, 2026 Goals) con todas las propiedades y vistas necesarias
---

# Setup Notion - Configuración Completa

**Ejecuta el workflow `setup-notion` de la skill `Notion`.**

## Qué hace automáticamente:

1. **Verifica conexión** con Notion MCP
2. **Crea página principal** "PAI 2026 Dashboard"
3. **Crea 3 databases** dentro del dashboard:
   - Daily Tracking (hábitos + actividad diaria)
   - Weekly Reviews (análisis semanal)
   - 2026 Goals (metas anuales)
4. **Configura propiedades** de cada database
5. **Guarda configuración** en ~/.config/pai/notion-config.json
6. **Crea entrada de ejemplo** para hoy

## Databases que crea:

### Daily Tracking
- 17 propiedades (Fecha, Date, Tipo Día, Status, 5 Hábitos, Score, Actividad, Learning, Racha)
- Vistas: Timeline, Calendar, Table, Gallery

### Weekly Reviews
- 10 propiedades (Semana, Fechas, Métricas, Tendencia, Insights)
- Vistas: Table + Chart, Board por tendencia

### 2026 Goals
- 8 propiedades (Goal, Quarter, Category, Target, Progress, Status)
- Vistas: Board por Quarter, Progress Bars, Timeline

## Requisitos:

✅ NOTION_API_KEY configurada en .mcp.json
✅ Integración "PAI MARC 2026" creada en Notion
✅ Notion MCP server funcionando

## Output esperado:

```
✅ SETUP COMPLETADO EXITOSAMENTE

📊 DATABASES CREADAS:
   1. Daily Tracking: https://notion.so/...
   2. Weekly Reviews: https://notion.so/...
   3. 2026 Goals: https://notion.so/...

📄 Dashboard Principal: https://notion.so/...

🎯 PRÓXIMOS PASOS:
   1. Abre el dashboard en Notion
   2. Verifica las databases
   3. Ejecuta /morning mañana
```

## Tiempo:

- **Primera vez:** ~30 segundos
- **Si ya existe:** Detecta y no duplica

## Uso:

```
/setup-notion
```

O también:
```
MARC, configura Notion para PAI
MARC, crea las databases de Notion
Setup completo de Notion por favor
```

---

**Sistema:** Notion Integration - Configuración Automática
**Solo necesitas ejecutarlo una vez**

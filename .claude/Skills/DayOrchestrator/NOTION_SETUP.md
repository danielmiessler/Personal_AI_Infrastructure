# Configuración Notion MCP para PAI

## 🔑 PASO 1: Obtener tu Notion API Key

### Método Rápido (Recomendado):

1. **Ir a Notion Integrations**: https://www.notion.so/my-integrations

2. **Crear nueva integración**:
   - Click en "+ New integration"
   - Name: `PAI MARC 2026`
   - Associated workspace: [Tu workspace]
   - Capabilities:
     - ✅ Read content
     - ✅ Update content
     - ✅ Insert content
   - Click "Submit"

3. **Copiar el Internal Integration Secret**:
   - Se verá como: `ntn_XXXXXXXXXXXXXXXXXXXXXXXX`
   - **GUÁRDALO SEGURO** - lo necesitarás en el siguiente paso

4. **Compartir página de Notion con la integración**:
   - Ve a tu página de Notion que quieres usar para PAI
   - Click en "..." (top right) → "Connections"
   - Busca "PAI MARC 2026" y conecta

### Pasos Visuales:

```
Notion → Settings & Members → My integrations → + New integration
→ Name: "PAI MARC 2026"
→ Submit
→ Copy "Internal Integration Secret"
```

---

## 🔐 PASO 2: Configurar el Token en PAI

Una vez tengas tu token `ntn_XXXXX`, ejecútalo:

```bash
# Opción 1: Variable de entorno (recomendado)
echo 'export NOTION_API_KEY="ntn_TU_TOKEN_AQUI"' >> ~/.zshrc  # o ~/.bashrc
source ~/.zshrc

# Opción 2: Editar .mcp.json directamente
# Reemplaza "REDACTED" en .claude/.mcp.json línea 88 con tu token
```

**IMPORTANTE:** El token debe empezar con `ntn_` (Notion internal integration token).

---

## 📊 PASO 3: Estructura de Base de Datos Notion para PAI

### Diseño Recomendado - 3 Databases:

#### 1. **Daily Tracking** (Base principal)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| **Fecha** | Date | Primary key - fecha del día |
| **Tipo Día** | Select | PAR / IMPAR |
| **Hábitos Score** | Number | 0-5 score diario |
| **Hábito 1: Gym** | Checkbox | 6:00 AM Deporte |
| **Hábito 2: Palabra=Ley** | Checkbox | Todas promesas cumplidas |
| **Hábito 3: 0 Alcohol/Tabaco** | Checkbox | Sin sustancias |
| **Hábito 4: Founder Flow** | Checkbox | 2h foco profundo |
| **Hábito 5: Acción Comercial** | Checkbox | 1 acción comercial |
| **Aplicaciones** | Number | # aplicaciones trabajo enviadas |
| **Outreach** | Number | # emails consultoría enviados |
| **Posts LinkedIn** | Number | # posts publicados |
| **Commits** | Number | # commits git del día |
| **Learning del Día** | Text | Insight automático |
| **Racha** | Number | Días consecutivos perfectos |
| **Status** | Status | Planned / In Progress / Complete |

**Vista sugerida**: Timeline por fecha

#### 2. **Weekly Reviews** (Análisis semanal)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| **Semana** | Title | "Semana 1 - 2026" |
| **Fecha Inicio** | Date | Lunes de la semana |
| **Score Total** | Number | /35 |
| **Porcentaje** | Formula | (Score Total / 35) * 100 |
| **Días Perfectos** | Number | Días con 5/5 |
| **Hábito Más Fuerte** | Select | 1-5 |
| **Hábito Más Débil** | Select | 1-5 |
| **Tendencia** | Select | ↗️ Subiendo / ↘️ Bajando / → Estable |
| **Aplicaciones Total** | Rollup | Sum desde Daily Tracking |
| **Outreach Total** | Rollup | Sum desde Daily Tracking |
| **Insights** | Text | Análisis automático |
| **Recomendaciones** | Text | Plan próxima semana |

**Vista sugerida**: Table + Chart de tendencia

#### 3. **2026 Goals Dashboard** (Meta-tracking)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| **Goal** | Title | Nombre del objetivo |
| **Quarter** | Select | Q1 / Q2 / Q3 / Q4 |
| **Category** | Select | Trabajo / Consultoría / Contenido / Hábitos |
| **Target** | Number | Meta numérica |
| **Current** | Rollup | Progreso actual desde Daily |
| **Progress** | Formula | (Current / Target) * 100 |
| **Status** | Status | On Track / At Risk / Behind |
| **Last Updated** | Last Edited Time | Auto |

---

## 🔄 PASO 4: Crear las Bases de Datos

### Opción A: Template Automático (Rápido)

Ejecuta este comando cuando tengas el token configurado:

```
MARC, crea mis bases de datos de Notion para PAI
```

Esto creará automáticamente las 3 databases con todas las propiedades.

### Opción B: Manual (Control total)

1. Crea una nueva página en Notion llamada "PAI 2026 Dashboard"
2. Dentro, crea 3 bases de datos inline con las propiedades de arriba
3. Comparte la página con tu integración "PAI MARC 2026"
4. Copia el Page ID (la parte después de notion.so/...)

---

## 🤖 PASO 5: Integración Automática con Workflows

Una vez configurado, los workflows se sincronizan automáticamente:

### `/morning` → Crea entrada en Notion
```
Morning workflow ejecuta
   ↓
Crea row en "Daily Tracking"
   ↓
Rellena: Fecha, Tipo Día, Status = "In Progress"
```

### `/evening` → Actualiza entrada
```
Evening workflow detecta actividad
   ↓
Actualiza row del día con:
   - Hábitos (checkboxes)
   - Score calculado
   - Aplicaciones/Outreach/Posts
   - Commits
   - Learning
   - Racha
   - Status = "Complete"
```

### `/weekreview` → Crea review semanal
```
Week review analiza 7 días
   ↓
Crea row en "Weekly Reviews"
   ↓
Rellena métricas agregadas + insights
```

---

## 📱 PASO 6: Visualización Móvil

Con Notion Mobile puedes:

- **Por la mañana**: Ver tu briefing del día en Notion
- **Durante el día**: Marcar hábitos según los cumples
- **Por la noche**: Ver tu score y racha actualizada
- **Fin de semana**: Review semanal visual con gráficos

---

## 🎨 Views Recomendadas en Notion

### Para "Daily Tracking":

1. **Timeline View** - Ver progreso mes completo
2. **Calendar View** - Vista calendario con scores
3. **Gallery View** - Cards con learning diario
4. **Table View** - Detalles completos

### Para "Weekly Reviews":

1. **Table View** - Comparación semanal
2. **Chart View** - Gráfico de tendencia
3. **Board View** - Por tendencia (Subiendo/Estable/Bajando)

### Para "2026 Goals":

1. **Board View** - Por Quarter
2. **Progress Bar View** - % completion visual
3. **Timeline View** - Roadmap 2026

---

## 🔍 Testing de Conexión

Para verificar que todo funciona:

```bash
# Test 1: Verificar conexión
MARC, conéctate a Notion y lista mis páginas

# Test 2: Crear página de prueba
MARC, crea una página de prueba en Notion

# Test 3: Buscar bases de datos
MARC, busca mi database "Daily Tracking" en Notion
```

---

## ⚡ Próximos Pasos

Después de configurar:

1. ✅ Token obtenido y configurado
2. ✅ Bases de datos creadas
3. ✅ Integración compartida con páginas
4. → Ejecutar primer `/morning` mañana
5. → Ver entrada auto-creada en Notion
6. → Ejecutar `/evening` por la noche
7. → Ver tracking completo sincronizado

---

## 🚨 Troubleshooting

**Error: "Unauthorized"**
- Verifica que el token empiece con `ntn_`
- Confirma que compartiste la página con la integración

**Error: "Database not found"**
- Asegúrate de que la integración tiene acceso a la página
- Verifica el database ID

**Error: "Invalid property"**
- Las propiedades deben coincidir exactamente con los nombres de arriba
- Usa los tipos correctos (Number, Checkbox, etc.)

---

## 📚 Referencias

- [Notion API Docs](https://developers.notion.com/)
- [Notion MCP Server GitHub](https://github.com/makenotion/notion-mcp-server)
- [Getting Started with MCP](https://developers.notion.com/docs/get-started-with-mcp)

---

**¿Listo?** Obtén tu token y dime cuando lo tengas configurado. Luego crearemos las bases de datos automáticamente.

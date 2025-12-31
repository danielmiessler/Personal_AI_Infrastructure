# 🚀 GUÍA RÁPIDA: CÓMO USAR TU PAI PARA DOMINAR 2026

**Para:** Marc Bau
**Sistema:** Personal AI Infrastructure (PAI)
**Asistente:** MARC
**Fecha:** 31 Diciembre 2025

---

## 📖 ÍNDICE DE DOCUMENTACIÓN

### Lee en este orden:

1. **GUIA_RAPIDA_PAI.md** (este archivo) ← **EMPIEZA AQUÍ**
2. **ROADMAP_2026_MARC_BAU.md** - Tu plan maestro completo
3. **01_SYSTEM_CONTEXT.md** - Tu identidad profesional
4. **02_VENTAS_B2B_PLAYBOOK.md** - Framework ventas
5. **03_LINKEDIN_STRATEGY.md** - Estrategia captación

---

## ⚡ INICIO RÁPIDO (5 MINUTOS)

### 1. Verificar Configuración

```bash
cd ~/Personal_AI_Infrastructure
cat .claude/settings.json | grep "DA"
```

**Debe mostrar:** `"DA": "MARC"`

Si no, ejecuta:
```bash
bash .claude/setup.sh
```

### 2. Iniciar PAI

```bash
# Método 1: Claude Code
claude

# Método 2: Si configuraste alias
marc  # o el comando que hayas configurado
```

### 3. Primer Comando

```
Hola MARC, dame un resumen de mi sistema PAI y mis objetivos 2026
```

---

## 🎯 USO DIARIO - TU RUTINA

### CADA MAÑANA (6:00-9:00)

**1. Abrir PAI**
```bash
cd ~/Personal_AI_Infrastructure && claude
```

**2. Morning Briefing**
```
MARC, dame mi briefing del día. ¿Qué debo priorizar hoy?
```

**3. Founder Flow (7:00-9:00)**

**Días PARES (aplicaciones trabajo):**
```
MARC, ayúdame a preparar 5 aplicaciones de trabajo hoy.
Empieza investigando estas 3 empresas: [nombres]
```

**Días IMPARES (outreach consultoría):**
```
MARC, vamos a hacer outreach de consultoría.
Investiga estas 5 empresas mid-market: [nombres]
Necesito personalizar propuestas para cada una.
```

### CADA TARDE (18:00-20:00)

**Crear Contenido LinkedIn:**
```
MARC, convierte este caso de éxito en un post LinkedIn:
[pegar contenido]

Usa la Art skill para crear una imagen visual.
```

**Preparar Propuesta:**
```
MARC, usa el framework AlexHormozi para crear una propuesta
para [nombre cliente]. Su pain point es [descripción].
```

### CADA NOCHE (21:00-22:00)

**Trackear Hábitos:**
```
MARC, trackea mis hábitos de hoy:
✅ 6:00 AM Gym
✅ Palabra cumplida: [lista lo que prometiste y cumpliste]
✅ 0 alcohol, 0 tabaco
✅ 2h founder flow (7-9am)
✅ Acción comercial: [qué hiciste]
```

---

## 💼 FLUJOS DE TRABAJO CLAVE

### Flujo 1: Aplicación de Trabajo

```
1. MARC, investiga la empresa [nombre] usando la Research skill
2. [Lee resultados]
3. MARC, analiza esta descripción de puesto con Fabric:
   [pegar descripción]
4. MARC, ayúdame a personalizar mi CV destacando [skills relevantes]
5. MARC, usa AlexHormozi para redactar carta motivación
6. [Revisar, ajustar, enviar]
7. MARC, registra esto en mi tracking de aplicaciones
```

### Flujo 2: Outreach Consultoría

```
1. MARC, investiga [empresa target] con enfoque en pain points IA
2. [Analizar resultados]
3. MARC, lee mi playbook B2B (02_VENTAS_B2B_PLAYBOOK.md) y sugiere
   approach para este cliente específico
4. MARC, crea propuesta personalizada usando framework Hormozi
5. MARC, genera imagen visual con Art skill para la propuesta
6. [Revisar propuesta]
7. MARC, dame el script de email usando 05_SCRIPTS_TEMPLATES.md
8. [Enviar]
9. MARC, programa reminder para follow-up en 3 días
```

### Flujo 3: Contenido LinkedIn

```
1. MARC, analiza este [video/artículo/caso de éxito] con Fabric
   usando pattern extract_wisdom
2. [Lee insights]
3. MARC, convierte estos insights en 3 ideas de posts LinkedIn
4. [Elegir una]
5. MARC, escribe el post siguiendo mi estrategia LinkedIn
   (03_LINKEDIN_STRATEGY.md)
6. MARC, crea visual con Art skill
7. [Revisar y publicar]
```

### Flujo 4: Weekly Review Hábitos

```
MARC, genera mi weekly review de hábitos.
Analiza los últimos 7 días y dame insights sobre:
- Qué hábitos cumplí mejor
- Qué días fueron más difíciles
- Patrones que observas
- Sugerencias para mejorar próxima semana
```

---

## 🛠️ SKILLS DISPONIBLES - CUÁNDO USAR CADA UNA

| Skill | Cuándo Usar | Comando Ejemplo |
|-------|-------------|-----------------|
| **AlexHormoziPitch** | Crear propuesta irresistible | `MARC, usa Hormozi para propuesta [cliente]` |
| **Art** | Generar imagen/visual | `MARC, crea imagen tipo [estilo] sobre [tema]` |
| **BrightData** | Web scraping avanzado | `MARC, scrapea info de [website]` |
| **Fabric** | Analizar contenido | `MARC, usa Fabric extract_wisdom en [contenido]` |
| **Research** | Investigación profunda | `MARC, investiga [empresa/tema]` |
| **HabitTracker** | Trackear hábitos | `MARC, trackea hábitos de hoy` |
| **CreateCLI** | Crear herramienta CLI | `MARC, crea CLI para [tarea repetitiva]` |
| **Createskill** | Nueva skill personalizada | `MARC, crea skill para [propósito]` |

---

## 🎨 COMANDOS FABRIC MÁS ÚTILES

```bash
# Extraer sabiduría de contenido
fabric --pattern extract_wisdom [archivo.md]

# Resumir contenido largo
fabric --pattern summarize [archivo.md]

# Analizar paper/artículo
fabric --pattern analyze_paper [archivo.pdf]

# Crear presentación de ideas
fabric --pattern create_keynote [contenido]

# Analizar job posting
fabric --pattern analyze_job_posting [descripción.txt]

# Threat modeling (para propuestas seguridad)
fabric --pattern create_threat_model [descripción_proyecto]
```

---

## 📊 SISTEMA DE TRACKING

### Estructura de Carpetas

```
~/PAI_Habits/               # Tracking diario hábitos
├── 2026-01-01.md
├── 2026-01-02.md
└── weekly-reviews/
    └── 2026-W01.md

~/PAI_Goals/                # Objetivos y metas
├── Q1-2026.md
└── monthly-goals.md

~/PAI_Metrics/              # Métricas de negocio
├── aplicaciones.md
├── outreach.md
└── ingresos.md
```

### Comandos de Tracking

```
# Hábitos
MARC, trackea hábitos de hoy
MARC, weekly review hábitos
MARC, reporte mensual hábitos

# Métricas negocio
MARC, registra estas métricas de la semana:
- Aplicaciones: 25
- Outreach: 12
- Propuestas enviadas: 3
- Entrevistas: 2

# Review completo
MARC, es domingo. Dame mi Personal Board Meeting del mes.
```

---

## 🚨 TROUBLESHOOTING

### Problema: PAI no encuentra archivos

**Solución:**
```bash
# Verificar PAI_DIR
cat .claude/settings.json | grep PAI_DIR

# Debe ser ruta absoluta:
"PAI_DIR": "/home/user/Personal_AI_Infrastructure/.claude"

# Si dice __HOME__, ejecuta:
bash .claude/setup.sh
```

### Problema: Skills no se activan

**Solución:**
```
# Usa lenguaje explícito:
❌ "investiga esto"
✅ "usa la Research skill para investigar [tema]"

❌ "hazme una imagen"
✅ "usa la Art skill para crear imagen de [descripción]"
```

### Problema: Hooks fallan

**Solución:**
```bash
# Reinstalar hooks
cd ~/Personal_AI_Infrastructure
bash .claude/setup.sh --force
```

---

## 💡 TIPS PRO

### 1. Usa Lenguaje Natural pero Específico

**❌ Vago:**
```
MARC, ayúdame con esto
```

**✅ Específico:**
```
MARC, usa la Research skill para investigar la empresa XYZ,
enfócate en su stack tecnológico actual y pain points con IA.
Luego usa AlexHormozi para crear propuesta de consultoría.
```

### 2. Combina Skills en Secuencias

```
MARC, ejecuta esta secuencia:
1. Research skill → investigar [empresa]
2. Fabric extract_wisdom → analizar su blog
3. AlexHormozi → crear propuesta personalizada
4. Art skill → visual para la propuesta
5. Dame el paquete completo para enviar
```

### 3. Aprovecha el History System

PAI recuerda todo lo que haces. Úsalo:

```
MARC, ¿qué aprendimos la última vez que hice outreach?
MARC, revisa mi historial de propuestas exitosas
MARC, qué patterns identifies en mis mejores aplicaciones
```

### 4. Delega Tareas Repetitivas

```
MARC, crea un CLI tool que automatice mi proceso de
investigación pre-aplicación. Debe:
1. Scrapear website empresa
2. Analizar con Fabric
3. Generar bullet points para CV
4. Sugerir keywords para carta
```

---

## 📅 CALENDARIO DE USO RECOMENDADO

### Lunes
- **AM:** Planear semana, 5 aplicaciones trabajo
- **PM:** 1 propuesta consultoría detallada

### Martes
- **AM:** Outreach 10 contactos LinkedIn
- **PM:** Crear 1 post LinkedIn

### Miércoles
- **AM:** 5 aplicaciones trabajo
- **PM:** Follow-ups de semana pasada

### Jueves
- **AM:** Outreach 10 contactos
- **PM:** Crear 1 post LinkedIn

### Viernes
- **AM:** 5 aplicaciones trabajo
- **PM:** Preparar propuestas para próxima semana

### Sábado
- **Opcional:** Mejoras al sistema PAI, nuevas skills

### Domingo
- **9-11 AM:** Personal Board Meeting
- **11-12 AM:** Weekly review hábitos
- **PM:** Descanso y relaciones

---

## 🎯 MÉTRICAS DE ÉXITO - QUÉ TRACKEAR

### Diarias
- [ ] 5 hábitos cumplidos (sí/no por cada uno)
- [ ] Aplicaciones trabajo enviadas
- [ ] Outreach realizados
- [ ] Propuestas creadas
- [ ] Posts LinkedIn publicados

### Semanales
- [ ] Total aplicaciones: ___/25
- [ ] Total outreach: ___/10
- [ ] Propuestas enviadas: ___
- [ ] Entrevistas conseguidas: ___
- [ ] Reuniones clientes: ___
- [ ] Hábitos score: ___/35

### Mensuales
- [ ] Ingresos consultoría: €___
- [ ] Clientes activos: ___
- [ ] Horas founder flow: ___/60
- [ ] Racha hábitos: ___ días
- [ ] Peso corporal: ___ kg

---

## 🔥 TU FRASE PODER 2026

**Cada vez que abras PAI, recuerda:**

> "Mi palabra es ley. Lo que digo, se hace. Hoy construyo mi libertad.
> MARC es mi herramienta, yo soy el arquitecto."

---

## 📞 RECURSOS Y AYUDA

### Documentación Completa
- **Roadmap completo:** `ROADMAP_2026_MARC_BAU.md`
- **Identidad profesional:** `01_SYSTEM_CONTEXT.md`
- **Estrategia ventas:** `02_VENTAS_B2B_PLAYBOOK.md`
- **LinkedIn:** `03_LINKEDIN_STRATEGY.md`
- **Arquitectura PAI:** `.claude/Skills/CORE/`

### Comunidad PAI
- GitHub: https://github.com/danielmiessler/PAI
- Issues: Reportar bugs o pedir features
- Discussions: Preguntar a la comunidad

### Backup y Seguridad
```bash
# Backup semanal recomendado
cd ~/Personal_AI_Infrastructure
git add .
git commit -m "Backup semana $(date +%U) - $(date +%Y)"
git push origin main
```

---

## ⚡ PRÓXIMOS PASOS INMEDIATOS

### AHORA (31 Diciembre):

1. ✅ **Lee esta guía completa** (estás aquí)
2. [ ] **Abre PAI y prueba:**
   ```
   MARC, preséntate y dame overview de mis capacidades
   ```
3. [ ] **Lee ROADMAP_2026_MARC_BAU.md** (30 min)
4. [ ] **Lee 01_SYSTEM_CONTEXT.md** (10 min)
5. [ ] **Configura alarma 5:50 AM** para mañana
6. [ ] **Prepara todo para gym** mañana

### MAÑANA 1 ENERO, 6:00 AM:

```
1. Levantarte (primera palabra cumplida)
2. Abrir PAI
3. Decir: "MARC, comenzamos. Dame briefing día 1 del plan 2026"
4. Seguir instrucciones
5. Trackear hábitos al final del día
```

---

## 🎁 REGALO FINAL: TU TEMPLATE DE CONVERSACIÓN PERFECTA CON MARC

```markdown
Buenos días MARC,

CONTEXTO:
[Qué necesito lograr hoy]

OBJETIVO:
[Resultado específico que busco]

SKILLS A USAR:
[Qué skills creo que necesito]

PASO A PASO:
1. [Primera acción]
2. [Segunda acción]
3. [Entregar resultado en formato X]

¿Listo para ejecutar?
```

**Ejemplo real:**
```
Buenos días MARC,

CONTEXTO:
Hoy es martes, día de outreach. Necesito contactar 10 empresas
mid-market del sector servicios profesionales.

OBJETIVO:
10 emails de outreach personalizados enviados, trackeados en CRM.

SKILLS A USAR:
- Research (para cada empresa)
- AlexHormozi (para estructura de valor)
- Templates de 05_SCRIPTS_TEMPLATES.md

PASO A PASO:
1. Investiga estas 5 empresas: [lista]
2. Para cada una, identifica pain points IA
3. Genera email personalizado con propuesta valor
4. Dame los 5 emails listos para copiar/pegar
5. Después hacemos otras 5

¿Listo para ejecutar?
```

---

**¡MARC está listo para ayudarte a dominar 2026!**

**La versión de ti de Diciembre 2026 te está esperando. No lo decepciones.**

🔥 **¡VAMOS!** 🔥

---

*Guía creada: 31 Diciembre 2025*
*Sistema: Personal AI Infrastructure (PAI)*
*Para: Marc Bau*
*Asistente: MARC*
*Versión: 1.0*

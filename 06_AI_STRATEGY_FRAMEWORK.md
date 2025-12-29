# AI STRATEGY FRAMEWORK
## De la Automatización a la Transformación Empresarial

---

> **⚠️ NOTA DE ACTUALIZACIÓN (Dic 2024)**
> 
> Este framework contiene conceptos de AI Strategy que siguen siendo válidos
> para entender cómo pensar sobre implementación de IA en empresas.
> 
> **Cambio de enfoque:**
> - **Antes:** AI Strategy enterprise-level (transformación de negocio)
> - **Ahora:** Implementación práctica mid-market (recuperar tiempo en procesos)
> 
> El nuevo posicionamiento se centra en:
> - "IA que entiende tu negocio"
> - Recuperar 20h/semana en procesos repetitivos
> - Asistentes personalizados, no transformación estratégica
> 
> **Para el contexto actualizado ver:** `01_SYSTEM_CONTEXT.md`
> 
> Los conceptos de este documento son útiles para:
> - Entender por qué proyectos de IA fallan
> - Preguntas de diagnóstico
> - Conversaciones con clientes más sofisticados

---

## INTRODUCCIÓN

Este documento integra aprendizajes de:
- **Sangit Paul Choudary** - Advisor de 40+ Fortune 500 CEOs, autor de "Reshuffle"
- **Greg Kamradt & Hamill** - Anti-patrones de AI Strategy (O'Reilly)
- **9 Patrones de Fallo en Adopción de AI** - Análisis de implementaciones fallidas

**Uso actual para Marc Bau:**
Estos conceptos son útiles para conversaciones de diagnóstico con clientes más sofisticados y para entender por qué muchos proyectos de IA fallan. El enfoque práctico actual es más acotado: identificar procesos repetitivos y automatizarlos con IA personalizada.

---

## PARTE 1: EL CAMBIO DE PARADIGMA

### 1.1 El Error Común: AI = Automatización

> "La mayoría de ejecutivos ven AI como automatización. Eso está mal y explica por qué sus estrategias de AI fallan."
> — Sangit Paul Choudary

**Cómo piensan la mayoría:**
```
"Necesitamos una estrategia de AI"
        ↓
"¿Qué tareas podemos automatizar?"
        ↓
"¿Cómo hacemos lo mismo pero más rápido/barato?"
        ↓
Implementan AI para acelerar procesos existentes
        ↓
Obtienen mejoras incrementales (10-20%)
        ↓
Se preguntan por qué la competencia les adelanta
```

**El problema:**
- Se quedan atrapados en "aquí está nuestro negocio, ¿cómo aplicamos AI?"
- Eso NO es estrategia
- Estrategia es responder: **¿Dónde jugamos? ¿Cómo ganamos?**

---

### 1.2 AI Como Infraestructura de Coordinación

**La visión correcta:**
```
AI no es solo para hacer cosas más rápido.
AI permite REORGANIZAR la actividad económica.

El verdadero impacto de cualquier tecnología ocurre cuando 
la actividad económica se reorganiza en base a las nuevas 
capacidades que la tecnología habilita.
```

**Ejemplo histórico - El Container de Shipping:**

```
PRIMER ORDEN (Automatización):
─────────────────────────────
• Container inventado
• Grúas automatizan la carga/descarga
• Trabajadores del puerto pierden empleos
• Puertos más rápidos

Si te hubieras quedado aquí, habrías visto solo automatización.


SEGUNDO ORDEN (Coordinación):
────────────────────────────
• Camiones, trenes y barcos acuerdan un ESTÁNDAR
• Logística global se desbloquea
• Envío de origen a destino sin fricción
• Shipping se vuelve CONFIABLE


TERCER ORDEN (Reorganización):
─────────────────────────────
• Antes: Manufactura verticalmente integrada
  (proveedores cerca porque el envío era poco fiable)
  
• Después: Cadenas de suministro globales
  (proveedores en cualquier parte del mundo)
  
• Países enteros suben o caen según cómo 
  se conectan al nuevo sistema

• Los empleos creados/destruidos NO fueron por 
  la automatización del puerto, sino por la 
  reorganización global de la manufactura
```

**Implicación para AI:**
```
Mucho trabajo del conocimiento está estructurado alrededor 
de ASUNCIONES DE ESCASEZ:

• "Acceso a talento especializado es caro"
• "El conocimiento está siloado por industria"
• "La ejecución de trabajo del conocimiento es costosa"

Cuando AI colapsa esas asunciones, hay que REIMAGINAR 
el negocio, no solo acelerar procesos existentes.
```

---

### 1.3 Ejemplo Moderno: Shein y la Lección de TikTok

**Lo que hizo TikTok:**
```
Redes sociales tradicionales (Facebook, Instagram):
• Necesitas construir un "social graph" (seguir personas)
• Tu feed se llena con contenido de tus conexiones
• Crecer red = prerequisito para engagement

TikTok (con móvil + 4G + AI):
• Videos cortos (<1 min) = más datos por sesión
• AI aprende tus intereses sin necesitar que sigas a nadie
• Construyó red social SIN social graph
• Destruyó la asunción dominante de la industria
```

**Cómo Shein aplicó la misma lógica a MANUFACTURA:**
```
Moda tradicional:
• Expertos van a Milán, detectan tendencias
• Crean colección para la siguiente temporada
• Producen en masa, esperan que venda
• Ciclos largos, ROI incierto

Shein (con AI + datos + manufactura flexible):
• Recoge datos de internet/TikTok constantemente
• Detecta micro-tendencias automáticamente
• Diseña rápido, produce batches de 50-100 unidades
• Testea en mercado, si vende → escala
• El algoritmo APRENDE qué diseños funcionan
• Ciclos de días, no temporadas
```

**La lección:**
> Una empresa de manufactura mirando TikTok habría dicho "esto es irrelevante, dime qué hacen las empresas de manufactura." Eso es exactamente el error. La pregunta correcta es: "¿Qué asunciones desbloqueó TikTok que yo puedo desbloquear en mi industria?"

---

### 1.4 El Framework: Dónde Se Mueve el Valor

```
┌─────────────────────────────────────────────────────────────┐
│     CUANDO LA TECNOLOGÍA CAMBIA, EL VALOR SE MUEVE          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PASO 1: Identificar las ASUNCIONES de tu negocio           │
│  ─────────────────────────────────────────────────          │
│  • ¿Por qué te pagan? ¿Qué es escaso?                       │
│  • ¿Qué costes asumes como fijos?                           │
│  • ¿Qué barreras de entrada te protegen?                    │
│                                                              │
│  PASO 2: Preguntar qué ASUNCIONES cambia AI                 │
│  ─────────────────────────────────────────────              │
│  • ¿El acceso a ese conocimiento sigue siendo caro?         │
│  • ¿Esa barrera de entrada sigue existiendo?                │
│  • ¿Ese coste sigue siendo fijo?                            │
│                                                              │
│  PASO 3: Proyectar DÓNDE se moverá el valor                 │
│  ──────────────────────────────────────────                 │
│  • Si X deja de ser escaso, ¿qué se vuelve escaso?          │
│  • ¿Quién captura ese nuevo valor?                          │
│  • ¿Puedo moverme hacia allí?                               │
│                                                              │
│  PASO 4: Decidir tu POSTURA FUTURA                          │
│  ─────────────────────────────────                          │
│  • ¿Nuevas capacidades necesarias?                          │
│  • ¿Nuevos mercados a entrar?                               │
│  • ¿Qué dejar de hacer?                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Ejemplo - Kodak vs Fujifilm:**
```
Cuando la fotografía digital colapsó el coste de tomar fotos:

KODAK:
• Sí adoptó digital (fue #1 en cámaras digitales en 2006)
• Pero no vio que el valor se movía a COMPARTIR fotos
• Siguió pensando en vender cámaras y gestionar fotos
• Bancarrota en 2011

FUJIFILM:
• Vio que su negocio REAL era química
• Las fotos eran solo UNA aplicación de esa química
• Movió sus capacidades a farmacéutica y cosmética
• Sobrevivió y prosperó
```

---

## PARTE 2: LOS ANTI-PATRONES (Cómo Fracasar)

### 2.1 El Anti-Value Stick

**Errores comunes disfrazados de estrategia:**

| Concepto Real | Anti-Patrón | Descripción |
|---------------|-------------|-------------|
| **Willingness to Pay** | Wishful Thinking Promises | Prometer que AI hará TODO sin detallar cómo |
| **Price** | Particularly Ridiculous Infrastructure Costs | Comprar GPUs carísimas sin análisis coste-beneficio |
| **Cost** | Cascade of Spectacular Technical Debt | Sistemas tan complicados que solo tú entiendes |
| **Value** | "Why This System?" = "Because AI" | Sin explicación adicional, como si fuera magia |

---

### 2.2 La Falsa Estrategia

**Señales de que NO tienes estrategia:**

```
❌ DIAGNÓSTICO FALSO:
   Coger el informe anual del año pasado, 
   subrayar párrafos al azar, declarar "hay que arreglar esto"
   
❌ POLÍTICA AMBIGUA:
   "Convertirnos en líderes globales de AI en todo"
   (sin definir qué significa "todo")
   
❌ PLAN DE ACCIÓN ABSURDO:
   • Herramienta de SEO con AI que garantiza #1 en Google
   • Plugin de arte generativo para NFTs del gato del CEO
   • Servicio de drones con AI para entregar almuerzos
   (anunciado todo en el All-Hands con traje brillante 
   usando "disruptivo" 12 veces)
   
❌ TIMELINES INEXISTENTES:
   "Perpetual beta" - crear backlog infinito en GitHub
   sin fechas de entrega reales
```

---

### 2.3 El Tsunami de Jerga

> "Una de las formas más efectivas de causar disfunción es usar jerga estratégicamente."

**Ejemplo de jerga que oscurece:**
```
"Nuestro sistema transformer multimodal agéntico 
aprovecha few-shot learning y chain-of-thought reasoning 
para optimizar el potencial sinérgico de nuestro 
espacio de hiperparámetros dinámico."

→ Si lo dices con confianza, nadie sabrá que no 
  significa nada concreto
```

**Cómo la jerga destruye equipos:**

| En lugar de decir... | Dices... | Resultado |
|---------------------|----------|-----------|
| "Hay que escribir un prompt" | "Estamos construyendo agentes" | Expertos de dominio excluidos |
| "El AI necesita contexto correcto" | "Implementamos RAG" | Nadie no-técnico puede opinar |
| "Usuarios pueden engañar al AI" | "Mitigamos prompt injections" | Problema parece solo técnico |

**El peligro:**
```
Si haces que escribir prompts parezca super técnico 
y fuera del alcance de todos, los INGENIEROS escribirán 
los prompts en lugar de los EXPERTOS DE DOMINIO.

¿Qué podría salir mal?
```

---

### 2.4 Zoning to Lose (Movilización Fallida)

```
ZONA DE INCUBACIÓN:
• Debería ser para probar ideas nuevas de AI
• ERROR: Lanzar chatbots sin testear directo a producción
• Sin QA, sin beta testing, directo al cliente
• "¿Qué es lo peor que puede pasar?" (PR disaster)

ZONA DE PRODUCTIVIDAD:
• Debería proteger productos que generan revenue
• ERROR: Sacar a los mejores ingenieros para proyectos AI
• Productos existentes se degradan
• Esperar... ¿profit?

RESULTADO:
Colapso total
```

---

### 2.5 Tools Over Process

**El patrón destructivo:**

```
Problema aparece
      ↓
Comprar herramienta para solucionarlo
      ↓
Otro problema aparece
      ↓
Comprar otra herramienta
      ↓
Mismo problema vuelve
      ↓
Comprar herramienta DIFERENTE
      ↓
Repetir hasta quedarse sin presupuesto
```

**Ejemplos específicos:**
```
❌ RAG no recupera documentos correctos 
   → Comprar vector database más cara
   (en vez de analizar por qué no recupera bien)

❌ Necesitas medir progreso 
   → Usar TODAS las métricas off-the-shelf
   (sin customizar a tu negocio)

❌ Agentes no funcionan 
   → Cambiar de framework y vendor
   → Fine-tune sin medición
   (asumir que será mejor porque es "nuevo")
```

---

### 2.6 Evitar Mirar los Datos

> "El consejo más potente: EVITA mirar los datos. Ten una venda a mano. Si te tropiezas con datos, póntela."

**La mentalidad destructiva:**
```
"Datos, eso suena desordenado. Que lo maneje una herramienta."

"Mirar datos es problema de ingeniería. 
Yo soy líder, tengo cosas más importantes que hacer.
Como reuniones sobre reuniones."

"Los desarrolladores siempre tienen más expertise 
de dominio que los equipos de negocio." (¿?)

"Confía en tu instinto. Te ha traído hasta aquí.
Los sentimientos son sustitutos fiables de datos,
especialmente en decisiones de millones de euros."
```

**Cómo asegurar que NADIE mire datos:**
```
Poner datos en sistemas complejos que solo ingenieros 
pueden acceder, no disponibles para expertos de dominio.

En vez de usar un spreadsheet simple o Airtable,
insistir en comprar una plataforma de análisis custom 
que requiere un equipo de PhDs para operar.

Puntos bonus si tarda 6 meses en cargar y da errores constantes.
```

---

## PARTE 3: LOS 9 PATRONES DE FALLO EN ADOPCIÓN

### 3.1 Integration Tarpit (Pantano de Integración)

```
SÍNTOMAS:
─────────
• Ingeniería entrega código AI funcional en semanas
• Ventas, legal, compliance tardan meses
• Reuniones de stakeholders multiplicándose
• Políticas y aprobaciones bloqueando todo

CAUSA RAÍZ:
───────────
El presupuesto de AI se estructuró en € y no en 
COSTE DE COORDINACIÓN. Un prototipo ≠ sistema que 
encaja en arquitectura de datos, compliance y política.

POR QUÉ ES PEGAJOSO:
────────────────────
"Si funciona técnicamente, el deployment será fácil."
La complejidad de integración solo es visible DESPUÉS 
de que el build está completo.

SOLUCIÓN:
─────────
• Tratar paths de aprobación tan críticamente como código
• Asignar un "Deployment PM" cuyo único trabajo es:
  - ¿Tenemos aprobación de datos?
  - ¿Tenemos clearance legal?
  - ¿Concerns de compliance resueltos?
  - ¿HR tiene objeciones?
• NO preguntan si el modelo funciona (otro rol)
• Presupuestar el lado organizacional desde día 1
```

---

### 3.2 Governance Vacuum (Vacío de Gobernanza)

```
SÍNTOMAS:
─────────
• Red team encuentra vulnerabilidades en sistemas AI
• Seguridad flaggea arquitectura no aprobada
• Nadie es dueño de "qué pasa si el AI hace algo malo"
• Pequeñas vulnerabilidades paralizan todo

CAUSA RAÍZ:
───────────
No hay un DRI (Directly Responsible Individual) que 
trate AI governance como objeto de primera clase.
Las skills de seguridad AI son DIFERENTES a IT security tradicional.

POR QUÉ ES PEGAJOSO:
────────────────────
"Démosle una revisión de seguridad normal."
Pero el equipo no tiene las herramientas correctas.
Parece burocracia innecesaria.
Un incidente congela todo.

SOLUCIÓN:
─────────
• Embedir talento con skills específicas de AI security
• Pensar en día 0 sobre:
  - ¿Qué puede acceder el agente AI?
  - ¿Cuál es su blast radius?
  - ¿Cómo se ven los modos de fallo?
  - ¿Cómo arquitectamos seguridad en vez de delegarla al AI?
  - ¿Cómo evaluamos si el agente hace lo correcto?
  - ¿Cómo testeamos prompt injections a escala?
```

---

### 3.3 Review Bottleneck (Cuello de Botella de Revisión)

```
SÍNTOMAS:
─────────
• AI genera output muy rápido
• Revisión humana no se acorta porque AI acelera
• Calidad de output varía salvajemente
• Ingenieros "babysitting" sistemas AI

CAUSA RAÍZ:
───────────
AI pegado a la parte equivocada del workflow: 
GENERACIÓN en vez de JUICIO.
Se mide éxito por cuánto se produce, no por calidad final.

POR QUÉ ES PEGAJOSO:
────────────────────
Demos impresionantes muestran velocidad de generación.
La carga de revisión está oculta.
KPI equivocado se convierte en el foco.

SOLUCIÓN:
─────────
• Diseñar sistemas human-in-the-loop desde el inicio
• Tus mejores humanos deben sentirse MÁS conectados 
  al trabajo gracias a AI, no peleando con AI
• AI drafea, humano revisa con capacidad cómoda
• Ser claro sobre el scope real del AI assistant
• Si alguien solo hace "merge" en PRs de AI sin revisar,
  estás extendiendo vulnerabilidad
```

---

### 3.4 Unreliable Intern (El Becario No Fiable)

```
SÍNTOMAS:
─────────
• AI maneja 80% de una tarea perfectamente
• Falla catastróficamente en el 20% restante
• No puedes predecir cuándo fallará
• Coste de supervisión ≈ coste de hacerlo manualmente

CAUSA RAÍZ:
───────────
AI carece de juicio, memoria y contexto específico.
Se despliega en tareas que no están "AI-ready" todavía.

POR QUÉ ES PEGAJOSO:
────────────────────
80% de éxito se siente "casi suficiente".
Equipos asumen que "un tweak más" lo arreglará.

SOLUCIÓN:
─────────
Auditar la tarea para "idoneidad de becario":

"¿Le daría esto a un becario inteligente pero 
olvidadizo que no puede aprender?"

Si le doy:
• Tarea clara
• Contexto claro
• Estructura clara de input/output

¿Podría hacerlo?

Si NO → No es AI-ready todavía
Si SÍ → Dividir en subtareas claras
       AI hace retrieval y formato
       Humano hace revisión
```

---

### 3.5 Handoff Tax (Impuesto de Traspaso)

```
SÍNTOMAS:
─────────
• AI maneja UN paso de proceso multi-paso
• Traspasos AI↔humano no están resueltos
• Tiempo total de ciclo apenas mejora (o empeora)

CAUSA RAÍZ:
───────────
Automatizaste la parte equivocada.
Optimizaste UN cuello de botella, creaste DOS nuevos 
en los bordes.

POR QUÉ ES PEGAJOSO:
────────────────────
KPIs por-paso se ven geniales.
"Redujimos tiempo de este paso 200%"
Pero nadie mide tiempo de ciclo completo.

SOLUCIÓN:
─────────
• Mapear workflow COMPLETO antes de desplegar AI
• Rediseñar para que AI maneje on-ramps y off-ramps
• No crear nuevos cuellos de botella en los bordes
• Medir CYCLE TIME del proceso completo
• Si cycle time no mejora, problema está en los bordes
• Incluir training a humanos en nuevos patrones de trabajo
```

---

### 3.6 Premature Scale Trap (Trampa del Escalado Prematuro)

```
SÍNTOMAS:
─────────
• Piloto exitoso → push rápido a toda la empresa
• Edge cases se multiplican inmediatamente
• Costes de soporte explotan
• Calidad se degrada

CAUSA RAÍZ:
───────────
Pilotos tienen ambiente CONTROLADO:
• Usuarios motivados
• Datos limpios
• Equipo que entiende limitaciones AI y las sortea

La org general NO tiene nada de eso.

POR QUÉ ES PEGAJOSO:
────────────────────
Liderazgo quiere wins rápidos.
"Capturar valor" parece urgente.
Testing parece retraso innecesario.

SOLUCIÓN:
─────────
• Documentar DIFERENCIAS entre ambiente piloto y real
• Documentar TODOS los workarounds que el equipo piloto usó
  (esos se convierten en training)
• Testear con usuarios ESCÉPTICOS, no entusiastas
• Segundo piloto en problema DIFÍCIL, parte caótica de la org
• Escalar en fases: 100 → 500 → 5000 → 50000
• Construir infraestructura de soporte en cada fase
• Monitorear: si tickets de soporte/usuario suben, PARAR
```

---

### 3.7 Automation Trap (Trampa de la Automatización)

```
SÍNTOMAS:
─────────
• AI acelera procesos existentes
• Pero outcomes no cambian
• Actividad aumenta, resultados no
• Has automatizado la ineficiencia

CAUSA RAÍZ:
───────────
Desplegaste AI antes de preguntar:
"¿Debería existir este proceso en absoluto?"
Automatizaste workflows de aprobación que quizás 
no necesitaban aprobación.

POR QUÉ ES PEGAJOSO:
────────────────────
Falacia del caballo mecánico:
Nueva tecnología debería parecerse a la anterior
(coche debería parecer caballo).
Es más fácil automatizar lo existente que reimaginar.

SOLUCIÓN:
─────────
• Antes de desplegar: "¿Deberíamos hacer esto en absoluto?"
• Identificar outcomes que importan independientemente del proceso:
  - Satisfacción del cliente
  - Métricas de negocio
  - Eficiencia real del job
• Prototipar versión "CERO proceso": 
  "¿Y si AI eliminara este workflow completo?"
• Puede que no funcione, pero pregúntalo
• Evolucionar: "AI no puede eliminar todo, pero puede 
  eliminar X partes hoy. Volveremos en 3 meses."
```

---

### 3.8 Existential Paralysis (Parálisis Existencial)

```
SÍNTOMAS:
─────────
• Liderazgo debate si AI canibalizará el core business
• Directivas conflictivas de senior leaders
• Discusiones de estrategia que loopean sin decisiones

CAUSA RAÍZ:
───────────
El ritmo de cambio de AI supera ciclos tradicionales 
de planning corporativo.
Para cuando tienes tu "estrategia AI de 5 años",
el landscape ya cambió.

POR QUÉ ES PEGAJOSO:
────────────────────
Incertidumbre de outcomes hace que cada decisión 
parezca de altísimo riesgo.
Más análisis se siente más seguro que comprometerse.

SOLUCIÓN:
─────────
Enfoque portfolio (para orgs conservadoras):

• Asignar budget a diferentes horizontes:
  - Payoff rápido (3-6 meses)
  - Apuestas a 2-3 años
  
• No tienes que predecir cuál gana - diversifica

• Fijar speed targets:
  - "Preguntas complejas respondidas en Slack en 90 días"
  - "CRM agéntico para leads en 8 meses"
  
• Diferenciar:
  - Inversiones de APRENDIZAJE
  - Inversiones de ESCALADO
  
• Gates claros para pasar de aprendizaje a escala

• Pensar como portfolio de equities:
  No invertir = garantía de no tener éxito
  Invertir diversificado = alguno funcionará
```

---

### 3.9 Training Deficit & Data Swamp

```
SÍNTOMAS:
─────────
• Baja adopción pese a disponibilidad de herramienta
• Usuarios vuelven a workflows antiguos
• AI no puede acceder a datos necesarios
• Problemas de calidad de datos emergen post-deployment

CAUSA RAÍZ:
───────────
Desplegaste herramienta, enseñaste a usar herramienta,
pero no pensaste en datos.
Infraestructura de datos no se arregla en semanas.
Es aburrida, cara, lenta.

POR QUÉ ES PEGAJOSO:
────────────────────
Training se trata como onboarding único.
No se construye capacidad para resolver problemas 
con datos usando AI tools.

SOLUCIÓN - TRAINING:
────────────────────
• Asignar 3-6 MESES de training esperado a escala enterprise
  antes de pensar en ROI
• Entrenar en WORKFLOWS, no en herramientas:
  ✓ "Cómo investigar inteligencia competitiva con AI"
  ✗ "Cómo usar ChatGPT"
• Herramientas cambiarán, workflows perduran
• Focalizarse en AI champions que pueden enseñar a pares
• Network effects aceleran adopción

SOLUCIÓN - DATOS:
─────────────────
• Auditoría completa de datos ANTES de deployment
• Priorizar acceso a datos para AI
• Asignar ownership claro de datos
• Alguien responsable de que datos estén disponibles para AI
```

---

## PARTE 4: POSICIONAMIENTO DE LOCAL AI EN AI STRATEGY

### 4.1 El Argumento Estratégico

```
CUANDO HABLAS SOLO DE LOCAL AI:
───────────────────────────────
"Podemos montar un servidor con Llama 3"

→ Suena a: implementador técnico
→ Compites con: cualquier consultora técnica
→ El cliente pregunta: "¿y qué hago con eso?"


CUANDO LIDERAS CON AI STRATEGY:
───────────────────────────────
"Ayudamos a reimaginar tu negocio con AI.
Y además podemos hacerlo sin que tus datos
salgan de tu red."

→ Suena a: consultor estratégico con capacidad de ejecución
→ Compites con: consultoras de estrategia (McKinsey, BCG)
→ El cliente dice: "Ah, y además tenéis algo único"
```

### 4.2 Cómo Local AI Encaja en Cada Patrón de Fallo

| Patrón de Fallo | Cómo Local AI Ayuda |
|-----------------|---------------------|
| **Integration Tarpit** | Menos dependencias externas = menos stakeholders que coordinar |
| **Governance Vacuum** | Control total de datos = governance más simple |
| **Review Bottleneck** | Puedes customizar el modelo a tu dominio específico |
| **Unreliable Intern** | Fine-tuning local = AI más fiable para tu contexto |
| **Handoff Tax** | Integración nativa con ERP (Odoo) = menos traspasos |
| **Premature Scale** | Coste fijo = escalado predecible |
| **Automation Trap** | No pagas por token = libertad para experimentar |
| **Existential Paralysis** | Soberanía de datos = decisión estratégica clara |
| **Training Deficit** | AI que "conoce" tus datos internos = adopción más fácil |

### 4.3 El Pitch Integrado

```
OPENER:
"La mayoría de empresas piensan que AI Strategy es 
'dónde ponemos AI para acelerar procesos'.

Eso está mal.

La pregunta correcta es: '¿Cómo cambia AI el terreno 
de juego de nuestra industria, y cómo ganamos en ese 
nuevo terreno?'"

GANCHO:
"Pero aquí está el problema: la mayoría de consultoras 
de estrategia te dan un PowerPoint y se van.

Nosotros podemos ejecutar. Y cuando ejecutamos, 
lo hacemos sin que tus datos salgan de tu red."

DIFERENCIADOR:
"¿Por qué importa eso?

Porque cuando tus datos de clientes, tus datos financieros,
tus ventajas competitivas están en APIs de terceros...
ya no son solo tuyos.

Con nosotros, tu AI es tu AI.
Tus datos son tus datos.
Tu ventaja competitiva sigue siendo tuya."

CIERRE:
"AI Strategy + Ejecución + Soberanía del Dato.
Eso es lo que ofrecemos."
```

---

## PARTE 5: FRAMEWORK DE TRABAJO CON CLIENTES

### 5.1 Fase de Diagnóstico Estratégico

**Preguntas a hacer:**
```
1. ASUNCIONES DEL NEGOCIO:
   "¿Por qué os pagan vuestros clientes realmente?"
   "¿Qué es escaso en vuestro mercado que justifica vuestro precio?"
   "¿Qué barreras de entrada os protegen?"

2. IMPACTO DE AI EN ASUNCIONES:
   "¿Qué pasaría si ese conocimiento/capacidad se 
   volviera commodity mañana?"
   "¿Quién nuevo podría entrar a competir si AI 
   elimina esa barrera?"

3. MOVIMIENTO DEL VALOR:
   "Si X deja de ser escaso, ¿qué se vuelve escaso?"
   "¿Dónde estará el valor en 2-3 años?"

4. POSTURA FUTURA:
   "¿Qué capacidades nuevas necesitaríais?"
   "¿Qué partes del negocio deberíais abandonar?"
   "¿Qué mercados nuevos podríais entrar?"
```

### 5.2 Fase de Diseño

**Principios:**
```
1. NO empezar con "¿dónde ponemos AI?"
   SÍ empezar con "¿cómo debería funcionar el trabajo?"

2. Antes de automatizar un proceso:
   "¿Debería existir este proceso?"

3. Diseñar para human-in-the-loop desde día 0

4. Mapear workflow COMPLETO, no solo la parte "AI"

5. Identificar datos necesarios ANTES de elegir tecnología

6. Definir métricas de éxito basadas en OUTCOMES,
   no en actividad
```

### 5.3 Fase de Implementación

**Checklist anti-patrones:**
```
☐ ¿Tenemos Deployment PM para coordinar stakeholders?
☐ ¿Hay un DRI para AI governance?
☐ ¿Hemos calculado capacidad de revisión humana?
☐ ¿Hemos auditado la tarea para "idoneidad de becario"?
☐ ¿Hemos mapeado on-ramps y off-ramps?
☐ ¿Tenemos plan de escalado en fases?
☐ ¿Hemos preguntado si el proceso debería existir?
☐ ¿Tenemos decisión clara, no parálisis?
☐ ¿Hay plan de training de 3-6 meses?
☐ ¿Los datos están disponibles y con ownership claro?
```

### 5.4 Métricas que Importan

```
NO MEDIR:
─────────
• % de adopción de herramienta
• # de outputs generados por AI
• Velocidad de generación
• # de casos de uso implementados

SÍ MEDIR:
─────────
• Cycle time de workflows completos
• Outcomes de negocio (revenue, satisfacción, eficiencia)
• Tiempo que expertos dedican a revisión vs creación
• Tasa de "volver a workflow antiguo"
• Tickets de soporte per usuario
• Confianza del equipo en outputs de AI
```

---

## PARTE 6: JOBS TO BE DONE Y VALOR FUTURO

### 6.1 Empleos "Sobre" y "Bajo" el Algoritmo

> "Cada vez más, hay dos tipos de empleos: los que están 'sobre el algoritmo' y los que están 'bajo el algoritmo'."

**Sobre el algoritmo:**
```
• El data scientist de Uber que CREA los algoritmos
• Pagado muy bien, en equity
• Alta agencia sobre su trabajo
• Define las reglas del juego
```

**Bajo el algoritmo:**
```
• El conductor de Uber GESTIONADO por algoritmos
• Poca agencia
• Pago determinado por el sistema
• Sigue las reglas del juego
```

**Lo que pasó con Google Maps y conductores:**
```
ANTES de Google Maps:
• Conductores experimentados (ej: taxistas de Londres)
• Conocimiento de rutas = ventaja competitiva
• Cobraban premium por experiencia

DESPUÉS de Google Maps:
• Conductores menos experimentados = mismo resultado
• El conocimiento se comoditizó
• Premium de experiencia colapsó
• Más conductores, menos pago por conductor
```

**Implicación para trabajo del conocimiento:**
```
AI complementando trabajo del conocimiento tendrá 
el MISMO efecto que Google Maps en conducción.

No es que el trabajo desaparezca (los conductores siguen).
Es que el trabajo que QUEDA se "vacía" hasta el mínimo,
se vuelve commodity, y se puede asignar por algoritmo.

En ese punto, pierdes agencia.
```

### 6.2 Consejo para Individuos

```
NO hacer:
─────────
• Reskilling sin saber hacia qué
• Aprender a usar herramientas AI sin estrategia
• Asumir que "augmentation" siempre es bueno para ti
• Confiar en que tu organización te dirá dónde encajas

SÍ hacer:
─────────
• Aplicar foresight: ¿Cómo será el terreno de juego en 1 año?
• Identificar qué será valioso en ese futuro
• Moverte hacia capturar ese valor
• Actualizar tu mapa constantemente según aprendes
• Pensar en la RESTRICCIÓN que gestionas, no en las tareas
```

### 6.3 El Valor de la Restricción

**Ejemplo - El anestesiólogo:**
```
Cada tarea que hace está automatizada por máquinas.
Él gestiona las máquinas.

Pero no le pagan por ser buen "gestor de máquinas".

Le pagan por gestionar el RIESGO en la sala:
Que la cantidad correcta de anestesia llegue 
al paciente correcto en el momento correcto.

Una restricción común que comanda mucho valor = RIESGO
Si puedes gestionar el riesgo en el sistema, capturas valor.
```

**Implicación:**
```
No mires las TAREAS que haces.
Mira la RESTRICCIÓN que gestionas.

Cuando AI mejora la ejecución de tareas,
el valor se mueve a quien gestiona la restricción.

La restricción vieja puede desaparecer,
pero restricciones NUEVAS emergerán en otro lugar.
```

---

## ANEXO: CHECKLIST DE AI STRATEGY PARA CLIENTES

```
FASE 0: DIAGNÓSTICO ESTRATÉGICO
───────────────────────────────
☐ Identificar asunciones de escasez del negocio
☐ Evaluar qué asunciones cambia AI
☐ Proyectar hacia dónde se mueve el valor
☐ Definir postura futura deseada
☐ Identificar capacidades nuevas necesarias

FASE 1: DISEÑO
──────────────
☐ Mapear workflows completos (no solo partes)
☐ Cuestionar si cada proceso debería existir
☐ Diseñar human-in-the-loop desde inicio
☐ Identificar datos necesarios y su ownership
☐ Definir métricas de outcome (no actividad)

FASE 2: PREPARACIÓN
───────────────────
☐ Asignar Deployment PM para coordinación
☐ Asignar DRI de AI governance
☐ Auditar tareas para "idoneidad de becario"
☐ Calcular capacidad de revisión humana
☐ Planificar training de 3-6 meses

FASE 3: PILOTO
──────────────
☐ Ambiente controlado con usuarios motivados
☐ Documentar TODOS los workarounds
☐ Testear con usuarios escépticos
☐ Segundo piloto en zona caótica
☐ Medir cycle time completo, no solo partes

FASE 4: ESCALADO
────────────────
☐ Escalar en fases (100 → 500 → 5000)
☐ Monitorear tickets de soporte/usuario
☐ PARAR si métricas degradan
☐ Construir infraestructura de soporte por fase
☐ Mantener feedback loops constantes

FASE 5: OPTIMIZACIÓN CONTINUA
─────────────────────────────
☐ Revisión trimestral: ¿Sigue existiendo la restricción?
☐ ¿Podemos eliminar más proceso?
☐ ¿Han mejorado los modelos para expandir scope?
☐ ¿Dónde están los nuevos cuellos de botella?
```

---

*Este documento se complementa con:*
- `01_SYSTEM_CONTEXT.md` - Contexto de empresa y servicios
- `02_VENTAS_B2B_PLAYBOOK.md` - Cómo vender estos servicios
- `03_LINKEDIN_STRATEGY.md` - Cómo generar leads con contenido

---

*Fuentes:*
- Sangit Paul Choudary - "Reshuffle" / CXO Talk
- Greg Kamradt & Hamill - O'Reilly AI Strategy
- 9 AI Failure Patterns Analysis

*Última actualización: Diciembre 2024*

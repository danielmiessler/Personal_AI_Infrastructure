#!/bin/bash
# Track Today - Registrar hábitos del día actual
# Parte del sistema HabitTracker de PAI

set -e

# Configuración
HABITS_DIR="$HOME/PAI_Habits"
TODAY=$(date +%Y-%m-%d)
TODAY_FILE="$HABITS_DIR/$TODAY.md"
TODAY_DISPLAY=$(date +"%d %B %Y")

# Crear directorio si no existe
mkdir -p "$HABITS_DIR"

# Verificar si ya existe el archivo de hoy
if [ -f "$TODAY_FILE" ]; then
    echo "⚠️  Ya existe un tracking para hoy: $TODAY_FILE"
    echo "¿Quieres ver el contenido actual?"
    cat "$TODAY_FILE"
    exit 0
fi

# Crear archivo con template
cat > "$TODAY_FILE" << EOF
# Hábitos - $TODAY_DISPLAY

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

---

*Archivo creado: $(date +"%Y-%m-%d %H:%M:%S")*
*Sistema: PAI HabitTracker*
EOF

echo "✅ Archivo de tracking creado: $TODAY_FILE"
echo ""
echo "📝 Ahora puedes editar el archivo para marcar tus hábitos cumplidos."
echo ""
echo "Comando para abrir: nano $TODAY_FILE"
echo "O usa tu editor preferido."

# Retornar ruta para que PAI pueda leerlo
echo ""
echo "FILE_PATH: $TODAY_FILE"

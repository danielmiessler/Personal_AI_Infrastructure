#!/bin/bash
# Weekly Review - Analizar última semana de hábitos
# Parte del sistema HabitTracker de PAI

set -e

# Configuración
HABITS_DIR="$HOME/PAI_Habits"
WEEKLY_DIR="$HABITS_DIR/weekly-reviews"
mkdir -p "$WEEKLY_DIR"

# Calcular fechas de la semana pasada (lunes a domingo)
TODAY=$(date +%Y-%m-%d)
WEEK_NUM=$(date +%U)
YEAR=$(date +%Y)
REVIEW_FILE="$WEEKLY_DIR/$YEAR-W$WEEK_NUM.md"

echo "🔍 Analizando última semana de hábitos..."
echo ""

# Obtener últimos 7 días
DATES=()
for i in {6..0}; do
    DATE=$(date -d "$i days ago" +%Y-%m-%d 2>/dev/null || date -v-${i}d +%Y-%m-%d)
    DATES+=("$DATE")
done

# Inicializar contadores
TOTAL_HABITS=0
TOTAL_POSSIBLE=35  # 7 días × 5 hábitos
DAYS_CHECKED=0

# Analizar cada día
echo "## Análisis Diario"
echo ""
for DATE in "${DATES[@]}"; do
    FILE="$HABITS_DIR/$DATE.md"
    if [ -f "$FILE" ]; then
        CHECKED=$(grep -c "\[x\]" "$FILE" 2>/dev/null || echo "0")
        TOTAL_HABITS=$((TOTAL_HABITS + CHECKED))
        DAYS_CHECKED=$((DAYS_CHECKED + 1))
        echo "- $DATE: $CHECKED/5 hábitos ✓"
    else
        echo "- $DATE: ❌ No tracked"
    fi
done

echo ""
echo "## Resumen Semanal"
echo "- Hábitos cumplidos: $TOTAL_HABITS/$TOTAL_POSSIBLE"
echo "- Porcentaje: $(awk "BEGIN {printf \"%.1f\", ($TOTAL_HABITS/$TOTAL_POSSIBLE)*100}")%"
echo "- Días trackeados: $DAYS_CHECKED/7"

# Calcular racha (simplificado - contar días consecutivos con 5/5 desde el final)
STREAK=0
for ((i=${#DATES[@]}-1; i>=0; i--)); do
    FILE="$HABITS_DIR/${DATES[$i]}.md"
    if [ -f "$FILE" ]; then
        CHECKED=$(grep -c "\[x\]" "$FILE" 2>/dev/null || echo "0")
        if [ "$CHECKED" -eq 5 ]; then
            STREAK=$((STREAK + 1))
        else
            break
        fi
    else
        break
    fi
done

echo "- Racha actual (días perfectos 5/5): $STREAK días"
echo ""

# Generar archivo de review
cat > "$REVIEW_FILE" << EOF
# Weekly Review - Semana $WEEK_NUM de $YEAR

**Periodo:** ${DATES[0]} a ${DATES[-1]}
**Generado:** $(date +"%Y-%m-%d %H:%M:%S")

## Métricas

| Métrica | Valor |
|---------|-------|
| Hábitos cumplidos | $TOTAL_HABITS/$TOTAL_POSSIBLE |
| Porcentaje | $(awk "BEGIN {printf \"%.1f\", ($TOTAL_HABITS/$TOTAL_POSSIBLE)*100}")% |
| Días trackeados | $DAYS_CHECKED/7 |
| Racha actual | $STREAK días perfectos |

## Análisis Detallado

EOF

# Agregar detalles diarios al archivo
for DATE in "${DATES[@]}"; do
    FILE="$HABITS_DIR/$DATE.md"
    if [ -f "$FILE" ]; then
        CHECKED=$(grep -c "\[x\]" "$FILE" 2>/dev/null || echo "0")
        echo "### $DATE - $CHECKED/5 ✓" >> "$REVIEW_FILE"
        echo "" >> "$REVIEW_FILE"
        # Extraer learnings si existen
        if grep -q "Learning del día:" "$FILE"; then
            LEARNING=$(sed -n '/Learning del día:/,/^$/p' "$FILE" | tail -n +2 | head -n 1)
            if [ ! -z "$LEARNING" ]; then
                echo "**Learning:** $LEARNING" >> "$REVIEW_FILE"
                echo "" >> "$REVIEW_FILE"
            fi
        fi
    else
        echo "### $DATE - ❌ No tracked" >> "$REVIEW_FILE"
        echo "" >> "$REVIEW_FILE"
    fi
done

# Agregar sección de ajustes
cat >> "$REVIEW_FILE" << EOF

## Reflexión

**¿Qué funcionó bien esta semana?**
-

**¿Qué hábito fue más difícil? ¿Por qué?**
-

**Ajustes para próxima semana:**
1.
2.
3.

**Compromiso renovado:**
-

---

*Sistema: PAI HabitTracker*
EOF

echo "✅ Review semanal generada: $REVIEW_FILE"
echo ""
echo "📊 Archivo disponible para lectura y edición."
echo ""
echo "FILE_PATH: $REVIEW_FILE"

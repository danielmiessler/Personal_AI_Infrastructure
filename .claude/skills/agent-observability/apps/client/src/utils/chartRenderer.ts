import type { ChartDataPoint, ChartConfig } from '../types';

export interface ChartDimensions {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export class ChartRenderer {
  private ctx: CanvasRenderingContext2D;
  private dimensions: ChartDimensions;
  private config: ChartConfig;
  private animationId: number | null = null;
  
  constructor(
    canvas: HTMLCanvasElement,
    dimensions: ChartDimensions,
    config: ChartConfig
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    this.ctx = ctx;
    this.dimensions = dimensions;
    this.config = config;
    this.setupCanvas(canvas);
  }
  
  private setupCanvas(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.dimensions.width * dpr;
    canvas.height = this.dimensions.height * dpr;
    canvas.style.width = `${this.dimensions.width}px`;
    canvas.style.height = `${this.dimensions.height}px`;
    this.ctx.scale(dpr, dpr);
  }
  
  private getChartArea() {
    const { width, height, padding } = this.dimensions;
    return {
      x: padding.left,
      y: padding.top,
      width: width - padding.left - padding.right,
      height: height - padding.top - padding.bottom
    };
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);
  }
  
  drawBackground() {
    const chartArea = this.getChartArea();
    
    // Create subtle gradient background
    const gradient = this.ctx.createLinearGradient(
      chartArea.x,
      chartArea.y,
      chartArea.x,
      chartArea.y + chartArea.height
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      chartArea.x,
      chartArea.y,
      chartArea.width,
      chartArea.height
    );
  }
  
  drawAxes() {
    const chartArea = this.getChartArea();

    // Super thin grey horizontal line only
    this.ctx.strokeStyle = '#444444';  // Dark grey
    this.ctx.lineWidth = 0.5;  // Super thin
    this.ctx.globalAlpha = 0.5;  // Slightly more visible

    // X-axis (horizontal timeline) - ONLY THIS, NO Y-AXIS
    this.ctx.beginPath();
    this.ctx.moveTo(chartArea.x, chartArea.y + chartArea.height);
    this.ctx.lineTo(chartArea.x + chartArea.width, chartArea.y + chartArea.height);
    this.ctx.stroke();

    // Restore alpha
    this.ctx.globalAlpha = 1.0;
  }
  
  drawTimeLabels(timeRange: string) {
    const chartArea = this.getChartArea();

    const labels = this.getTimeLabels(timeRange);
    const spacing = chartArea.width / (labels.length - 1);

    // Draw vertical grid lines at time markers
    this.ctx.save();
    this.ctx.strokeStyle = '#444444';  // Dark grey
    this.ctx.lineWidth = 0.5;  // Super thin
    this.ctx.globalAlpha = 0.5;  // Slightly more visible

    labels.forEach((label, index) => {
      const x = chartArea.x + (index * spacing);

      // Draw vertical grid line
      this.ctx.beginPath();
      this.ctx.moveTo(x, chartArea.y);
      this.ctx.lineTo(x, chartArea.y + chartArea.height);
      this.ctx.stroke();
    });

    this.ctx.restore();

    // Draw text labels
    this.ctx.fillStyle = this.config.colors.text;
    this.ctx.font = '11px system-ui, -apple-system, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    labels.forEach((label, index) => {
      const x = chartArea.x + (index * spacing);
      const y = chartArea.y + chartArea.height + 5;
      this.ctx.fillText(label, x, y);
    });
  }
  
  private getTimeLabels(timeRange: string): string[] {
    switch (timeRange) {
      case '1m':
        return ['60s', '45s', '30s', '15s', 'now'];
      case '3m':
        return ['3m', '2m', '1m', 'now'];
      case '5m':
        return ['5m', '4m', '3m', '2m', '1m', 'now'];
      case '10m':
        return ['10m', '8m', '6m', '4m', '2m', 'now'];
      default:
        return [];
    }
  }
  
  drawBars(
    dataPoints: ChartDataPoint[],
    maxValue: number,
    progress: number = 1,
    formatLabel?: (eventTypes: Record<string, number>) => string,
    getSessionColor?: (sessionId: string) => string,
    getAppColor?: (appName: string) => string
  ) {
    const chartArea = this.getChartArea();
    const barCount = this.config.maxDataPoints;
    const totalBarWidth = chartArea.width / barCount;
    const barWidth = this.config.barWidth;
    
    dataPoints.forEach((point, index) => {
      if (point.count === 0) return;
      
      const x = chartArea.x + (index * totalBarWidth) + (totalBarWidth - barWidth) / 2;
      const barHeight = (point.count / maxValue) * chartArea.height * progress;
      const y = chartArea.y + chartArea.height - barHeight;
      
      // Get the dominant session color for this bar
      let barColor = this.config.colors.primary;
      if (getSessionColor && point.sessions && Object.keys(point.sessions).length > 0) {
        // Get the session with the most events in this time bucket
        const dominantSession = Object.entries(point.sessions)
          .sort((a, b) => b[1] - a[1])[0][0];
        barColor = getSessionColor(dominantSession);
      }
      
      // Draw full-height grey vertical lines for all events
      this.ctx.save();
      this.ctx.strokeStyle = '#444444';  // Dark grey (matching grid lines)
      this.ctx.lineWidth = 0.5;  // Super thin (matching grid lines)
      this.ctx.globalAlpha = 0.5;  // Slightly more visible (matching grid lines)

      this.ctx.beginPath();
      this.ctx.moveTo(x + barWidth/2, chartArea.y);
      this.ctx.lineTo(x + barWidth/2, chartArea.y + chartArea.height);
      this.ctx.stroke();

      this.ctx.restore();
      
      // Draw professional icons with counts
      if (point.eventTypes && Object.keys(point.eventTypes).length > 0 && barHeight > 10) {
        const eventTypeColors: Record<string, string> = {
          'PreToolUse': '#e0af68',      // Tokyo Night yellow
          'PostToolUse': '#9ece6a',     // Tokyo Night green
          'Notification': '#ff9e64',    // Tokyo Night orange
          'Stop': '#f7768e',            // Tokyo Night red
          'SubagentStop': '#bb9af7',    // Tokyo Night magenta
          'PreCompact': '#1abc9c',      // Tokyo Night teal
          'UserPromptSubmit': '#7dcfff', // Tokyo Night cyan
          'SessionStart': '#7aa2f7',    // Tokyo Night blue
          'SessionEnd': '#7aa2f7'       // Tokyo Night blue
        };

        const entries = Object.entries(point.eventTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3); // Top 3 event types

        if (entries.length > 0) {
          this.ctx.save();
          this.ctx.font = '11px system-ui, -apple-system, sans-serif';
          this.ctx.fontWeight = 'bold';

          // Calculate total width needed
          const iconSize = 44;  // Doubled from 22px to 44px for maximum visibility
          const iconSpacing = 12;
          const countSpacing = 8;
          let totalWidth = 0;

          const measurements = entries.map(([_type, count]) => {
            const countText = count > 1 ? `×${count}` : '';
            const textWidth = countText ? this.ctx.measureText(countText).width : 0;
            const itemWidth = iconSize + (countText ? countSpacing + textWidth : 0);
            totalWidth += itemWidth + iconSpacing;
            return { countText, textWidth, itemWidth };
          });
          totalWidth -= iconSpacing; // Remove last spacing

          // Calculate background dimensions
          const padding = 14;  // Increased padding for larger icons
          const bgWidth = totalWidth + padding * 2;
          const bgHeight = 54;  // Increased to accommodate 44px icons

          // Position centered on bar
          const labelX = x + barWidth / 2;
          const labelY = y + barHeight / 2;
          const bgX = labelX - bgWidth / 2;
          const bgY = labelY - bgHeight / 2;

          // NO background - icons are transparent stroke-based like Lucide

          // Draw icons and counts
          let currentX = bgX + padding;
          entries.forEach(([type, _count], idx) => {
            const color = eventTypeColors[type] || '#7aa2f7';
            const measurement = measurements[idx];
            const iconCenterX = currentX + iconSize / 2;
            const iconCenterY = labelY;

            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            // Draw icon based on type using EXACT Lucide SVG icons
            const iconMap: Record<string, string> = {
              'PreToolUse': 'wrench',
              'PostToolUse': 'check-circle',
              'Notification': 'bell',
              'Stop': 'stop-circle',
              'SubagentStop': 'user-check',
              'PreCompact': 'package',
              'UserPromptSubmit': 'message-square',
              'SessionStart': 'rocket',
              'SessionEnd': 'flag'
            };

            const lucideIcon = iconMap[type];
            if (lucideIcon) {
              this.drawLucideIcon(lucideIcon, iconCenterX, iconCenterY, iconSize * 0.6, color);
            } else {
              // Draw a simple dot for unknown types
              this.ctx.beginPath();
              this.ctx.arc(iconCenterX, iconCenterY, 3, 0, Math.PI * 2);
              this.ctx.fill();
            }

            currentX += iconSize;

            // Draw count if > 1
            if (measurement.countText) {
              currentX += countSpacing;
              this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              this.ctx.textAlign = 'left';
              this.ctx.textBaseline = 'middle';
              this.ctx.fillText(measurement.countText, currentX, labelY);
              currentX += measurement.textWidth;
            }

            currentX += iconSpacing;
          });

          // Draw app name(s) below the icons
          if (point.apps && Object.keys(point.apps).length > 0) {
            const appNames = Object.entries(point.apps)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2) // Top 2 apps
              .map(([name, _]) => name.replace('kai:', ''))
              .join(', ');

            if (appNames) {
              // Multi-tier vertical staggering to prevent label overlap
              const tierCount = 4;  // 4 vertical tiers for distribution
              const tierSpacing = 13;  // Pixels between each tier
              const tierIndex = index % tierCount;
              const tierOffset = tierIndex * tierSpacing;

              // Get the dominant app color for the label
              let labelColor = 'rgba(255, 255, 255, 0.9)';
              if (getAppColor && point.apps && Object.keys(point.apps).length > 0) {
                const dominantApp = Object.entries(point.apps)
                  .sort((a, b) => b[1] - a[1])[0][0]
                  .replace('kai:', '');
                labelColor = getAppColor(dominantApp);
              }

              // Monospace code font with agent color
              this.ctx.font = '300 9px "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace';
              this.ctx.fillStyle = labelColor;
              this.ctx.textAlign = 'center';
              this.ctx.textBaseline = 'top';
              this.ctx.fillText(appNames, labelX, bgY + bgHeight + 6 + tierOffset);
            }
          }

          this.ctx.restore();
        }
      }
    });
  }
  
  private drawBarGlow(x: number, y: number, width: number, height: number, intensity: number, color?: string) {
    const glowRadius = 10 + (intensity * 20);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    const glowColor = color || this.config.colors.glow;
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, glowRadius
    );
    gradient.addColorStop(0, this.adjustColorOpacity(glowColor, 0.3 * intensity));
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      centerX - glowRadius,
      centerY - glowRadius,
      glowRadius * 2,
      glowRadius * 2
    );
  }
  
  private adjustColorOpacity(color: string, opacity: number): string {
    // Simple opacity adjustment - assumes hex color
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }
  
  drawPulseEffect(x: number, y: number, radius: number, opacity: number) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.adjustColorOpacity(this.config.colors.primary, opacity));
    gradient.addColorStop(0.5, this.adjustColorOpacity(this.config.colors.primary, opacity * 0.5));
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  animate(renderCallback: (progress: number) => void) {
    const startTime = performance.now();
    
    const frame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.config.animationDuration, 1);
      
      renderCallback(this.easeOut(progress));
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(frame);
      } else {
        this.animationId = null;
      }
    };
    
    this.animationId = requestAnimationFrame(frame);
  }
  
  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  resize(dimensions: ChartDimensions) {
    this.dimensions = dimensions;
    this.setupCanvas(this.ctx.canvas as HTMLCanvasElement);
  }

  // Draw Lucide icons using Path2D with exact SVG paths
  // These match the EXACT icons shown in EventRow.vue

  private drawLucideIcon(iconName: string, x: number, y: number, size: number, color: string) {
    this.ctx.save();

    // Scale and translate to position icon correctly
    // Lucide icons have 24x24 viewBox, scale to our size
    const scale = size / 24;
    this.ctx.translate(x - size/2, y - size/2);
    this.ctx.scale(scale, scale);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.fillStyle = 'none';

    // Exact Lucide SVG path data (from lucide-vue-next package)
    switch (iconName) {
      case 'wrench': {
        const p = new Path2D('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z');
        this.ctx.stroke(p);
        break;
      }
      case 'check-circle': {
        const p1 = new Path2D('M22 11.08V12a10 10 0 1 1-5.93-9.14');
        const p2 = new Path2D('M9 11l3 3L22 4');
        this.ctx.stroke(p1);
        this.ctx.stroke(p2);
        break;
      }
      case 'bell': {
        const p1 = new Path2D('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9');
        const p2 = new Path2D('M10.3 21a1.94 1.94 0 0 0 3.4 0');
        this.ctx.stroke(p1);
        this.ctx.stroke(p2);
        break;
      }
      case 'stop-circle': {
        // Circle
        this.ctx.beginPath();
        this.ctx.arc(12, 12, 10, 0, Math.PI * 2);
        this.ctx.stroke();
        // Rectangle
        this.ctx.strokeRect(9, 9, 6, 6);
        break;
      }
      case 'user-check': {
        // User path
        const p1 = new Path2D('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2');
        // Head circle
        this.ctx.beginPath();
        this.ctx.arc(9, 7, 4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.stroke(p1);
        // Checkmark
        const p2 = new Path2D('M16 11l2 2l4-4');
        this.ctx.stroke(p2);
        break;
      }
      case 'package': {
        const p1 = new Path2D('M7.5 4.27l9 5.15');
        const p2 = new Path2D('M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z');
        const p3 = new Path2D('M3.3 7l8.7 5l8.7-5');
        const p4 = new Path2D('M12 22V12');
        this.ctx.stroke(p1);
        this.ctx.stroke(p2);
        this.ctx.stroke(p3);
        this.ctx.stroke(p4);
        break;
      }
      case 'message-square': {
        const p = new Path2D('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
        this.ctx.stroke(p);
        break;
      }
      case 'rocket': {
        const p1 = new Path2D('M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z');
        const p2 = new Path2D('M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z');
        const p3 = new Path2D('M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0');
        const p4 = new Path2D('M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5');
        this.ctx.stroke(p1);
        this.ctx.stroke(p2);
        this.ctx.stroke(p3);
        this.ctx.stroke(p4);
        break;
      }
      case 'flag': {
        const p1 = new Path2D('M4 15s1-1 4-1s5 2 8 2s4-1 4-1V3s-1 1-4 1s-5-2-8-2s-4 1-4 1z');
        this.ctx.stroke(p1);
        // Line
        this.ctx.beginPath();
        this.ctx.moveTo(4, 15);
        this.ctx.lineTo(4, 22);
        this.ctx.stroke();
        break;
      }
    }

    this.ctx.restore();
  }

  private drawWrench(x: number, y: number, size: number) {
    // This will be replaced with SVG rendering in the main draw loop
  }

  private drawCheckmark(x: number, y: number, size: number) {
    // CheckCircle icon - matches Lucide CheckCircle (PostToolUse)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Outer circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, size/2.2, 0, Math.PI * 2);
    this.ctx.stroke();

    // Checkmark inside
    this.ctx.beginPath();
    this.ctx.moveTo(x - size/4, y);
    this.ctx.lineTo(x - size/10, y + size/4);
    this.ctx.lineTo(x + size/3, y - size/3);
    this.ctx.stroke();
  }

  private drawBell(x: number, y: number, size: number) {
    // Bell icon - matches Lucide Bell (Notification)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Bell body (curved trapezoid)
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size/2.2);
    this.ctx.bezierCurveTo(x - size/2.5, y - size/3, x - size/2.5, y, x - size/2.5, y + size/5);
    this.ctx.lineTo(x + size/2.5, y + size/5);
    this.ctx.bezierCurveTo(x + size/2.5, y, x + size/2.5, y - size/3, x, y - size/2.2);
    this.ctx.stroke();

    // Bell bottom line
    this.ctx.beginPath();
    this.ctx.moveTo(x - size/2.8, y + size/5);
    this.ctx.lineTo(x + size/2.8, y + size/5);
    this.ctx.stroke();

    // Bell clapper (small arc)
    this.ctx.beginPath();
    this.ctx.arc(x, y + size/2.5, size/10, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawStopCircle(x: number, y: number, size: number) {
    // StopCircle icon - matches Lucide StopCircle (Stop)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Outer circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, size/2.2, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner square (stroke only, not filled)
    const squareSize = size/3.5;
    this.ctx.beginPath();
    this.ctx.rect(x - squareSize/2, y - squareSize/2, squareSize, squareSize);
    this.ctx.stroke();
  }

  private drawUsers(x: number, y: number, size: number) {
    // Users icon - matches Lucide Users (SubagentStop)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Left person
    this.ctx.beginPath();
    this.ctx.arc(x - size/4, y - size/5, size/7, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(x - size/4, y + size/3, size/3.5, Math.PI * 1.1, Math.PI * 1.9);
    this.ctx.stroke();

    // Right person
    this.ctx.beginPath();
    this.ctx.arc(x + size/4, y - size/5, size/7, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(x + size/4, y + size/3, size/3.5, Math.PI * 1.1, Math.PI * 1.9);
    this.ctx.stroke();
  }

  private drawPackage(x: number, y: number, size: number) {
    // Package icon - matches Lucide Package (PreCompact)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Box outline
    const boxSize = size * 0.85;
    this.ctx.beginPath();
    this.ctx.rect(x - boxSize/2, y - boxSize/2, boxSize, boxSize);
    this.ctx.stroke();

    // Cross lines
    this.ctx.beginPath();
    this.ctx.moveTo(x - boxSize/2, y);
    this.ctx.lineTo(x + boxSize/2, y);
    this.ctx.moveTo(x, y - boxSize/2);
    this.ctx.lineTo(x, y + boxSize/2);
    this.ctx.stroke();
  }

  private drawMessage(x: number, y: number, size: number) {
    // MessageSquare icon - matches Lucide MessageSquare (UserPromptSubmit)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Rounded rectangle
    const rectSize = size * 0.8;
    const radius = size/5;
    this.ctx.beginPath();
    this.ctx.moveTo(x - rectSize/2 + radius, y - rectSize/2);
    this.ctx.arcTo(x + rectSize/2, y - rectSize/2, x + rectSize/2, y + rectSize/2, radius);
    this.ctx.arcTo(x + rectSize/2, y + rectSize/2, x - rectSize/2, y + rectSize/2, radius);
    this.ctx.arcTo(x - rectSize/2, y + rectSize/2, x - rectSize/2, y - rectSize/2, radius);
    this.ctx.arcTo(x - rectSize/2, y - rectSize/2, x + rectSize/2, y - rectSize/2, radius);
    this.ctx.stroke();
  }

  private drawRocket(x: number, y: number, size: number) {
    // Rocket icon - matches Lucide Rocket (SessionStart)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Rocket body
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size/2);
    this.ctx.lineTo(x - size/3, y);
    this.ctx.lineTo(x - size/3, y + size/3);
    this.ctx.lineTo(x + size/3, y + size/3);
    this.ctx.lineTo(x + size/3, y);
    this.ctx.closePath();
    this.ctx.stroke();

    // Fins
    this.ctx.beginPath();
    this.ctx.moveTo(x - size/3, y + size/6);
    this.ctx.lineTo(x - size/1.8, y + size/2.5);
    this.ctx.moveTo(x + size/3, y + size/6);
    this.ctx.lineTo(x + size/1.8, y + size/2.5);
    this.ctx.stroke();

    // Window
    this.ctx.beginPath();
    this.ctx.arc(x, y - size/8, size/8, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawFlag(x: number, y: number, size: number) {
    // Flag icon - matches Lucide Flag (SessionEnd)
    // Stroke-only, no fill
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Flag pole
    this.ctx.beginPath();
    this.ctx.moveTo(x - size/2.5, y - size/2);
    this.ctx.lineTo(x - size/2.5, y + size/2);
    this.ctx.stroke();

    // Flag fabric
    this.ctx.beginPath();
    this.ctx.moveTo(x - size/2.5, y - size/2);
    this.ctx.lineTo(x + size/3, y - size/3);
    this.ctx.lineTo(x + size/3, y + size/8);
    this.ctx.lineTo(x - size/2.5, y + size/6);
    this.ctx.stroke();
  }
}

export function createChartRenderer(
  canvas: HTMLCanvasElement,
  dimensions: ChartDimensions,
  config: ChartConfig
): ChartRenderer {
  return new ChartRenderer(canvas, dimensions, config);
}
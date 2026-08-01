import type { ChartDataPoint } from "@/hooks/useChartData";

// ─── Types ───

export interface ChartDimensions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ChartConfig {
  maxDataPoints: number;
  animationDuration: number;
  barWidth: number;
  barGap: number;
  colors: { primary: string; glow: string; axis: string; text: string };
}

// ─── Agent Color Map ───

const AGENT_COLORS: Record<string, string> = {
  pentester: "#EF4444",
  engineer: "#3B82F6",
  designer: "#A855F7",
  architect: "#A855F7",
  intern: "#06B6D4",
  artist: "#06B6D4",
  "perplexity-researcher": "#EAB308",
  "claude-researcher": "#EAB308",
  "gemini-researcher": "#EAB308",
  main: "#3B82F6",
  da: "#3B82F6",
  pai: "#3B82F6",
  "claude-code": "#3B82F6",
};

// ─── Tool Color Map ───

const TOOL_COLORS: Record<string, string> = {
  Read: "#7aa2f7",
  Write: "#9ece6a",
  Edit: "#e0af68",
  Bash: "#bb9af7",
  Grep: "#f7768e",
  Glob: "#ff9e64",
  Task: "#73daca",
  WebFetch: "#7dcfff",
  WebSearch: "#7dcfff",
  Skill: "#c0caf5",
  SlashCommand: "#c0caf5",
  TodoWrite: "#e0af68",
  AskUserQuestion: "#bb9af7",
  NotebookEdit: "#9ece6a",
  NotebookRead: "#7aa2f7",
  BashOutput: "#bb9af7",
  KillShell: "#f7768e",
  ExitPlanMode: "#9ece6a",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  PreToolUse: "#e0af68",
  PostToolUse: "#ff9e64",
  Completed: "#9ece6a",
  Notification: "#ff9e64",
  Stop: "#f7768e",
  SubagentStop: "#bb9af7",
  PreCompact: "#1abc9c",
  UserPromptSubmit: "#7dcfff",
  SessionStart: "#7aa2f7",
  SessionEnd: "#7aa2f7",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  PreToolUse: "Pre-Tool",
  PostToolUse: "Post-Tool",
  UserPromptSubmit: "Prompt",
  SessionStart: "Session Start",
  SessionEnd: "Session End",
  Stop: "Stop",
  SubagentStop: "Subagent",
  PreCompact: "Compact",
  Notification: "Notification",
  Completed: "Completed",
};

// ─── Renderer Class ───

export class ChartRenderer {
  private ctx: CanvasRenderingContext2D;
  private dimensions: ChartDimensions;
  private config: ChartConfig;
  private animationId: number | null = null;
  private currentFrameLabels: { x: number; y: number; width: number; height: number }[] = [];

  constructor(canvas: HTMLCanvasElement, dimensions: ChartDimensions, config: ChartConfig) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
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
      height: height - padding.top - padding.bottom,
    };
  }

  // ─── Collision Detection ───

  private calculateNonOverlappingPosition(
    chartArea: { x: number; y: number; width: number; height: number },
    preferredX: number,
    labelWidth: number
  ): { x: number; y: number } | null {
    const LABEL_HEIGHT = 32;
    const MIN_SPACING = 6;
    const MAX_H_OFFSET = 80;
    const H_STEP = 20;

    const minY = chartArea.y + 20;
    const maxY = chartArea.y + chartArea.height - LABEL_HEIGHT - 10;
    const verticalRange = maxY - minY;
    const labelIndex = this.currentFrameLabels.length;
    const preferredY = minY + ((labelIndex * 47) % verticalRange);

    if (this.currentFrameLabels.length === 0) {
      return { x: preferredX, y: minY };
    }

    const hasOverlap = (cx: number, cy: number): boolean => {
      for (const ex of this.currentFrameLabels) {
        const cR = cx + labelWidth;
        const cB = cy + LABEL_HEIGHT;
        const eR = ex.x + ex.width;
        const eB = ex.y + ex.height;
        if (cx - MIN_SPACING < eR && cR + MIN_SPACING > ex.x && cy - MIN_SPACING < eB && cB + MIN_SPACING > ex.y) {
          return true;
        }
      }
      return false;
    };

    const vStep = LABEL_HEIGHT + MIN_SPACING;
    const tryPositions: number[] = [preferredY];
    for (let offset = vStep; offset <= verticalRange; offset += vStep) {
      if (preferredY + offset <= maxY) tryPositions.push(preferredY + offset);
      if (preferredY - offset >= minY) tryPositions.push(preferredY - offset);
    }

    for (const y of tryPositions) {
      if (!hasOverlap(preferredX, y)) return { x: preferredX, y };
      for (let off = H_STEP; off <= MAX_H_OFFSET; off += H_STEP) {
        const rx = preferredX + off;
        if (rx + labelWidth <= chartArea.x + chartArea.width - MIN_SPACING && !hasOverlap(rx, y)) {
          return { x: rx, y };
        }
        const lx = preferredX - off;
        if (lx >= chartArea.x + MIN_SPACING && !hasOverlap(lx, y)) {
          return { x: lx, y };
        }
      }
    }

    return null;
  }

  // ─── Drawing Methods ───

  clear() {
    this.ctx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);
    this.currentFrameLabels = [];
  }

  drawBackground() {
    const area = this.getChartArea();
    const grad = this.ctx.createLinearGradient(area.x, area.y, area.x, area.y + area.height);
    grad.addColorStop(0, "rgba(0,0,0,0.02)");
    grad.addColorStop(1, "rgba(0,0,0,0.05)");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(area.x, area.y, area.width, area.height);
  }

  drawAxes() {
    const area = this.getChartArea();
    this.ctx.save();
    this.ctx.strokeStyle = "#444444";
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(area.x, area.y + area.height);
    this.ctx.lineTo(area.x + area.width, area.y + area.height);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawTimeLabels(timeRange: string) {
    const area = this.getChartArea();
    const labels = this.getTimeLabels(timeRange);
    const spacing = area.width / (labels.length - 1);

    // Grid lines
    this.ctx.save();
    this.ctx.strokeStyle = "#444444";
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.5;
    labels.forEach((_, i) => {
      const x = area.x + i * spacing;
      this.ctx.beginPath();
      this.ctx.moveTo(x, area.y);
      this.ctx.lineTo(x, area.y + area.height);
      this.ctx.stroke();
    });
    this.ctx.restore();

    // Text labels
    this.ctx.fillStyle = "#565f89";
    this.ctx.font = '400 11px system-ui, -apple-system, sans-serif';
    this.ctx.textBaseline = "top";
    labels.forEach((label, i) => {
      const x = area.x + i * spacing;
      const y = area.y + area.height + 10;
      this.ctx.textAlign = i === 0 ? "left" : i === labels.length - 1 ? "right" : "center";
      this.ctx.fillText(label, x, y);
    });
  }

  private getTimeLabels(timeRange: string): string[] {
    const map: Record<string, string[]> = {
      "1M": ["60s", "45s", "30s", "15s", "Now"],
      "2M": ["2m", "90s", "1m", "30s", "Now"],
      "4M": ["4m", "3m", "2m", "1m", "Now"],
      "8M": ["8m", "6m", "4m", "2m", "Now"],
      "16M": ["16m", "12m", "8m", "4m", "Now"],
    };
    return map[timeRange] || map["1M"];
  }

  drawBars(dataPoints: ChartDataPoint[], maxValue: number, progress: number = 1) {
    const area = this.getChartArea();
    const barCount = this.config.maxDataPoints;
    const totalBarWidth = area.width / barCount;
    const barWidth = this.config.barWidth;

    dataPoints.forEach((point, index) => {
      if (point.count === 0) return;

      const x = area.x + index * totalBarWidth + (totalBarWidth - barWidth) / 2;
      const barHeight = (point.count / maxValue) * area.height * progress;

      // Vertical guide line
      this.ctx.save();
      this.ctx.strokeStyle = "#444444";
      this.ctx.lineWidth = 0.5;
      this.ctx.globalAlpha = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x + barWidth / 2, area.y);
      this.ctx.lineTo(x + barWidth / 2, area.y + area.height);
      this.ctx.stroke();
      this.ctx.restore();

      // Skip labels for short bars
      if (barHeight <= 10) return;
      if (!point.eventTypes || Object.keys(point.eventTypes).length === 0) return;

      const entries = Object.entries(point.eventTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (entries.length === 0) return;

      this.ctx.save();

      // Get dominant app name
      let appName = "";
      let agentColor = "#7aa2f7";
      if (point.apps && Object.keys(point.apps).length > 0) {
        const dominant = Object.entries(point.apps).sort((a, b) => b[1] - a[1])[0];
        appName = dominant[0];
        const agentNameOnly = appName.split(":")[0].toLowerCase();
        agentColor = AGENT_COLORS[agentNameOnly] || "#7aa2f7";
      }

      const rawDisplayName = appName ? appName.split(":")[0] : "";
      const displayName = rawDisplayName ? rawDisplayName.charAt(0).toUpperCase() + rawDisplayName.slice(1) : "";

      // Get dominant tool name
      let toolName = "";
      if (point.rawEvents && point.rawEvents.length > 0) {
        const toolCounts: Record<string, number> = {};
        for (const ev of point.rawEvents) {
          const t = ev.payload?.tool_name;
          if (t) toolCounts[t] = (toolCounts[t] || 0) + 1;
        }
        if (Object.keys(toolCounts).length > 0) {
          toolName = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0][0];
        }
      }

      // Calculate total label width
      const pillGap = 7;
      const pillPadding = 7;
      const pillHeight = 21;
      const padding = 8;

      // Agent pill
      this.ctx.font = '600 11px "SF Mono", Monaco, monospace';
      const agentTextW = displayName ? this.ctx.measureText(displayName).width : 0;
      const agentPillW = displayName ? agentTextW + pillPadding * 2 : 0;

      // Event type pill
      const eventTypeLabel = entries.length > 0 ? (EVENT_TYPE_LABELS[entries[0][0]] || entries[0][0]) : "";
      this.ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      const eventTextW = eventTypeLabel ? this.ctx.measureText(eventTypeLabel).width : 0;
      const eventPillW = eventTypeLabel ? 10 + 4 + eventTextW + pillPadding * 2 : 0;

      // Tool pill
      this.ctx.font = '500 11px "SF Mono", Monaco, monospace';
      const toolTextW = toolName ? this.ctx.measureText(toolName).width : 0;
      const toolPillW = toolName ? 10 + 4 + toolTextW + pillPadding * 2 : 0;

      const totalWidth =
        agentPillW +
        (agentPillW && eventPillW ? pillGap : 0) +
        eventPillW +
        (eventPillW && toolPillW ? pillGap : 0) +
        toolPillW;
      const bgWidth = totalWidth + padding * 2;
      const bgHeight = 32;

      const centerX = x + barWidth / 2;
      const preferredBgX = centerX - bgWidth / 2;

      const position = this.calculateNonOverlappingPosition(area, preferredBgX, bgWidth);

      if (position === null) {
        // Fallback: small colored dot
        const dotR = 4;
        const dotX = centerX;
        const dotY = area.y + area.height - barHeight / 2;
        const glow = this.ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotR * 3);
        glow.addColorStop(0, agentColor + "40");
        glow.addColorStop(1, "transparent");
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(dotX, dotY, dotR * 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = agentColor;
        this.ctx.beginPath();
        this.ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        return;
      }

      const bgX = position.x;
      const bgY = position.y;
      const labelY = bgY + bgHeight / 2;

      this.currentFrameLabels.push({ x: bgX, y: bgY, width: bgWidth, height: bgHeight });

      // Leader line if offset
      if (Math.abs(bgX - preferredBgX) > 5) {
        this.ctx.save();
        this.ctx.strokeStyle = agentColor + "60";
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, area.y + area.height - barHeight / 2);
        this.ctx.lineTo(bgX + bgWidth / 2, labelY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();
      }

      let currentX = bgX + padding;
      const pillRadius = 4;

      // PILL 1: Agent Name
      if (displayName) {
        this.ctx.font = '600 11px "SF Mono", Monaco, monospace';
        const w = this.ctx.measureText(displayName).width + pillPadding * 2;
        const py = labelY - pillHeight / 2;

        this.ctx.fillStyle = this.hexToRgba(agentColor, 0.15);
        this.drawRoundedRect(currentX, py, w, pillHeight, pillRadius);
        this.ctx.fill();

        this.ctx.fillStyle = agentColor;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(displayName, currentX + pillPadding, labelY);
        currentX += w + pillGap;
      }

      // PILL 2: Event Type
      if (eventTypeLabel) {
        const eventColor = EVENT_TYPE_COLORS[entries[0][0]] || "#7aa2f7";
        this.ctx.font = '600 11px system-ui, -apple-system, sans-serif';
        const tw = this.ctx.measureText(eventTypeLabel).width;
        const w = 10 + 4 + tw + pillPadding * 2;
        const py = labelY - pillHeight / 2;

        this.ctx.fillStyle = this.hexToRgba(eventColor, 0.15);
        this.drawRoundedRect(currentX, py, w, pillHeight, pillRadius);
        this.ctx.fill();

        this.ctx.fillStyle = eventColor;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(eventTypeLabel, currentX + pillPadding + 14, labelY);
        currentX += w + pillGap;
      }

      // PILL 3: Tool
      if (toolName) {
        const toolColor = TOOL_COLORS[toolName] || "#7aa2f7";
        this.ctx.font = '500 11px "SF Mono", Monaco, monospace';
        const tw = this.ctx.measureText(toolName).width;
        const w = 10 + 4 + tw + pillPadding * 2;
        const py = labelY - pillHeight / 2;

        this.ctx.fillStyle = this.hexToRgba(toolColor, 0.15);
        this.drawRoundedRect(currentX, py, w, pillHeight, pillRadius);
        this.ctx.fill();

        this.ctx.fillStyle = toolColor;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(toolName, currentX + pillPadding + 14, labelY);
      }

      this.ctx.restore();
    });
  }

  drawPulseEffect(x: number, y: number, radius: number, opacity: number) {
    const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, this.hexToRgba(this.config.colors.primary, opacity));
    grad.addColorStop(0.5, this.hexToRgba(this.config.colors.primary, opacity * 0.5));
    grad.addColorStop(1, "transparent");
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
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

  // ─── Helpers ───

  private hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}

export function createChartRenderer(canvas: HTMLCanvasElement, dimensions: ChartDimensions, config: ChartConfig) {
  return new ChartRenderer(canvas, dimensions, config);
}

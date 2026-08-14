#!/usr/bin/env bun
/**
 * Vitals.ts — read-only macOS system performance inspector.
 *
 * Subcommands:
 *   check    Fast snapshot: load, memory, swap, disk, thermal, top processes (ps-based, ~1s)
 *   hogs     Live per-process CPU / memory / energy from top's SECOND sample (~3s)
 *   gpu      GPU utilization via ioreg (no sudo); explicit fallback message if unavailable
 *   memory   vm_stat detail, pressure level, swap, compressor
 *   disk     Volume usage + Spotlight indexing status
 *   thermal  Throttle state (pmset -g therm) + battery/power source
 *   startup  launchd user agents: totals, running, failed (non-zero last exit)
 *   full     All of the above
 *
 * Flags: --json (structured output) · --top N (process list length, default 10)
 *
 * Read-only by design: this tool never kills, renices, unloads, or writes system state.
 * No shell interpolation anywhere — fixed argv arrays via Bun.spawnSync.
 */

type Json = Record<string, unknown>;

const argv = process.argv.slice(2);
const JSON_MODE = argv.includes("--json");
const topIdx = argv.indexOf("--top");
const TOP_N = topIdx !== -1 ? Math.max(1, parseInt(argv[topIdx + 1] ?? "10", 10) || 10) : 10;
const cmd = argv.find((a) => !a.startsWith("--") && a !== String(TOP_N)) ?? "check";

function run(bin: string, args: string[], timeoutMs = 20000): string {
  const p = Bun.spawnSync([bin, ...args], { timeout: timeoutMs, stdout: "pipe", stderr: "pipe" });
  return p.success ? new TextDecoder().decode(p.stdout).trim() : "";
}

function sysctl(key: string): string {
  return run("/usr/sbin/sysctl", ["-n", key]);
}

// ---------- collectors ----------

function loadInfo(): Json {
  const raw = sysctl("vm.loadavg"); // "{ 2.05 2.10 2.33 }"
  const parts = raw.replace(/[{}]/g, "").trim().split(/\s+/).map(Number);
  const ncpu = parseInt(sysctl("hw.ncpu"), 10) || 1;
  const up = run("/usr/bin/uptime", []);
  return {
    load_1m: parts[0] ?? null,
    load_5m: parts[1] ?? null,
    load_15m: parts[2] ?? null,
    cores: ncpu,
    load_per_core_1m: parts[0] != null ? +(parts[0] / ncpu).toFixed(2) : null,
    uptime: up.match(/up\s+(.+?),\s+\d+ users?/)?.[1] ?? up,
  };
}

function memoryInfo(): Json {
  const pageSize = parseInt(sysctl("hw.pagesize"), 10) || 16384;
  const vm = run("/usr/bin/vm_stat", []);
  const page = (label: string): number => {
    const m = vm.match(new RegExp(`${label}:\\s+(\\d+)`));
    return m ? parseInt(m[1], 10) : 0;
  };
  const gb = (pages: number) => +((pages * pageSize) / 1024 ** 3).toFixed(2);
  const totalGb = +(parseInt(sysctl("hw.memsize"), 10) / 1024 ** 3).toFixed(0);
  // 1 = normal, 2 = warning, 4 = critical
  const levelNum = parseInt(sysctl("kern.memorystatus_vm_pressure_level"), 10);
  const level = { 1: "normal", 2: "warning", 4: "critical" }[levelNum] ?? `unknown(${levelNum})`;
  const swapRaw = sysctl("vm.swapusage"); // "total = 2048.00M  used = 512.00M ..."
  const swapUsed = swapRaw.match(/used = ([\d.]+)M/)?.[1];
  return {
    total_gb: totalGb,
    pressure_level: level,
    free_gb: gb(page("Pages free")),
    active_gb: gb(page("Pages active")),
    wired_gb: gb(page("Pages wired down")),
    compressed_gb: gb(page("Pages occupied by compressor")),
    swap_used_mb: swapUsed ? +swapUsed : null,
    swapins: page("Swapins"),
    swapouts: page("Swapouts"),
  };
}

function thermalInfo(): Json {
  const therm = run("/usr/bin/pmset", ["-g", "therm"]);
  const speedLimit = therm.match(/CPU_Speed_Limit\s*=\s*(\d+)/)?.[1];
  const schedLimit = therm.match(/Scheduler_Limit\s*=\s*(\d+)/)?.[1];
  const batt = run("/usr/bin/pmset", ["-g", "batt"]);
  const source = batt.match(/'(.+?)'/)?.[1] ?? "unknown";
  const speedNum = speedLimit != null ? parseInt(speedLimit, 10) : null;
  return {
    cpu_speed_limit_pct: speedNum, // 100 = no throttle; null = key not reported (common on desktops)
    scheduler_limit_pct: schedLimit != null ? parseInt(schedLimit, 10) : null,
    throttled: speedNum != null ? speedNum < 100 : false,
    power_source: source,
    raw: therm || "(pmset -g therm returned nothing)",
  };
}

function diskInfo(): Json {
  const parse = (line: string) => {
    const f = line.trim().split(/\s+/);
    return f.length >= 9
      ? { size: f[1], used: f[2], avail: f[3], capacity: f[4], mount: f.slice(8).join(" ") }
      : null;
  };
  const rows = run("/bin/df", ["-h", "/", "/System/Volumes/Data"])
    .split("\n")
    .slice(1)
    .map(parse)
    .filter(Boolean);
  const spotlight = run("/usr/bin/mdutil", ["-s", "/"]);
  return { volumes: rows, spotlight: spotlight.split("\n").pop()?.trim() ?? "unknown" };
}

function psTop(sortBy: "cpu" | "rss"): Json[] {
  // ps's own -m sort is unreliable on modern macOS (observed mis-ordering by RSS) — sort in code.
  // pcpu is a decaying average — fine for a snapshot.
  const out = run("/bin/ps", ["-Areo", "pid,pcpu,pmem,rss,comm"]);
  return out
    .split("\n")
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const f = line.trim().split(/\s+/);
      return {
        pid: +f[0],
        cpu_pct: +f[1],
        mem_pct: +f[2],
        rss_mb: +(+f[3] / 1024).toFixed(0),
        command: f.slice(4).join(" ").split("/").pop() ?? f[4],
      };
    })
    .sort((a, b) => (sortBy === "cpu" ? b.cpu_pct - a.cpu_pct : b.rss_mb - a.rss_mb))
    .slice(0, TOP_N);
}

function topSecondSample(): { rows: Json[]; header: string } {
  // top's first sample reports since-boot cumulative CPU — always take the SECOND sample.
  // One call only (each -l 2 run costs ~3s of sampling); energy ordering is re-sorted in code.
  const p = Bun.spawnSync(
    ["/usr/bin/top", "-l", "2", "-n", String(Math.max(TOP_N * 4, 40)), "-o", "cpu", "-stats", "pid,cpu,power,mem,command"],
    { timeout: 30000, stdout: "pipe", stderr: "pipe", env: { ...process.env, COLUMNS: "200" } },
  );
  const out = p.success ? new TextDecoder().decode(p.stdout).trim() : "";
  const samples = out.split(/^Processes:/m);
  const second = samples[samples.length - 1] ?? "";
  const lines = second.split("\n");
  const headerIdx = lines.findIndex((l) => /^PID\s/.test(l.trim()));
  const rows =
    headerIdx === -1
      ? []
      : lines
          .slice(headerIdx + 1)
          .filter((l) => l.trim())
          .map((line) => {
            const f = line.trim().split(/\s+/);
            return {
              pid: +f[0],
              cpu_pct: parseFloat(f[1]),
              power: parseFloat(f[2]), // top's energy-impact-style score, relative
              mem: f[3],
              command: f.slice(4).join(" "),
            };
          });
  const loadLine = second.split("\n").find((l) => l.startsWith("Load Avg")) ?? "";
  return { rows, header: loadLine };
}

function gpuInfo(): Json {
  const out = run("/usr/sbin/ioreg", ["-r", "-d", "1", "-w", "0", "-c", "IOAccelerator"]);
  const util = out.match(/"Device Utilization %"=(\d+)/)?.[1];
  const renderer = out.match(/"Renderer Utilization %"=(\d+)/)?.[1];
  const inUseMem = out.match(/"In use system memory"=(\d+)/)?.[1];
  if (util == null && renderer == null) {
    return {
      available: false,
      note: "ioreg exposes no GPU utilization counters on this system — for GPU detail run: sudo powermetrics -n 1 -i 1000 --samplers gpu_power",
    };
  }
  return {
    available: true,
    device_utilization_pct: util != null ? +util : null,
    renderer_utilization_pct: renderer != null ? +renderer : null,
    gpu_system_memory_gb: inUseMem != null ? +(+inUseMem / 1024 ** 3).toFixed(2) : null,
  };
}

function startupInfo(): Json {
  const out = run("/bin/launchctl", ["list"]);
  const lines = out.split("\n").slice(1).filter((l) => l.trim());
  const running = lines.filter((l) => /^\d+/.test(l.trim()));
  const failed = lines
    .map((l) => l.trim().split(/\s+/))
    .filter((f) => f[0] === "-" && f[1] !== "0" && f[1] !== "-")
    .map((f) => ({ last_exit: +f[1], label: f[2] }));
  return {
    user_agents_total: lines.length,
    running: running.length,
    failed_last_exit: failed.slice(0, 20),
    note: "Login items + background task management need sudo: sfltool dumpbtm",
  };
}

// ---------- rendering ----------

const out: Json = {};
const P = (s: string) => !JSON_MODE && console.log(s);

function sectionCheck() {
  const load = loadInfo();
  const mem = memoryInfo();
  const therm = thermalInfo();
  const disk = diskInfo();
  const cpu = psTop("cpu");
  const memHogs = psTop("rss");
  Object.assign(out, { load, memory: mem, thermal: therm, disk, top_cpu: cpu, top_memory: memHogs });
  P(`LOAD     ${load.load_1m} / ${load.load_5m} / ${load.load_15m} on ${load.cores} cores (${load.load_per_core_1m}/core) · up ${load.uptime}`);
  P(`MEMORY   pressure=${mem.pressure_level} · ${mem.total_gb}GB total · free ${mem.free_gb}GB · compressed ${mem.compressed_gb}GB · swap used ${mem.swap_used_mb}MB`);
  P(`THERMAL  ${therm.throttled ? `THROTTLED (CPU at ${therm.cpu_speed_limit_pct}%)` : "not throttled"} · power: ${therm.power_source}`);
  for (const v of disk.volumes as Json[]) P(`DISK     ${v.mount}: ${v.used}/${v.size} (${v.capacity}) · ${disk.spotlight}`);
  P(`\nTOP CPU (ps snapshot)`);
  for (const r of cpu) P(`  ${String(r.cpu_pct).padStart(6)}%  ${String(r.rss_mb).padStart(6)}MB  ${r.command}`);
  P(`\nTOP MEMORY`);
  for (const r of memHogs) P(`  ${String(r.mem_pct).padStart(5)}%  ${String(r.rss_mb).padStart(6)}MB  ${r.command}`);
}

function sectionHogs() {
  P(`Sampling live (top -l 2, second sample — ~3s)...`);
  const sample = topSecondSample();
  const cpuRows = sample.rows.slice(0, TOP_N);
  const powerRows = [...sample.rows]
    .sort((a, b) => (Number(b.power) || 0) - (Number(a.power) || 0))
    .slice(0, TOP_N);
  Object.assign(out, { live_cpu: cpuRows, live_energy: powerRows, load_line: sample.header });
  P(`\n${sample.header}`);
  P(`\nLIVE CPU`);
  for (const r of cpuRows) P(`  ${String(r.cpu_pct).padStart(6)}%  pwr=${String(r.power).padStart(6)}  ${String(r.mem).padStart(8)}  ${r.command}`);
  P(`\nLIVE ENERGY (top 'power' score, same sample)`);
  for (const r of powerRows) P(`  pwr=${String(r.power).padStart(6)}  cpu=${String(r.cpu_pct).padStart(5)}%  ${r.command}`);
}

function sectionGpu() {
  const gpu = gpuInfo();
  Object.assign(out, { gpu });
  if (!gpu.available) P(`GPU      ${gpu.note}`);
  else P(`GPU      device=${gpu.device_utilization_pct}% renderer=${gpu.renderer_utilization_pct}% · gpu-held memory ${gpu.gpu_system_memory_gb}GB`);
}

function sectionMemory() {
  const mem = memoryInfo();
  Object.assign(out, { memory: mem });
  for (const [k, v] of Object.entries(mem)) P(`${k.padEnd(16)} ${v}`);
}

function sectionDisk() {
  const disk = diskInfo();
  Object.assign(out, { disk });
  for (const v of disk.volumes as Json[]) P(`${v.mount}: ${v.used}/${v.size} used (${v.capacity}), ${v.avail} free`);
  P(`Spotlight: ${disk.spotlight}`);
}

function sectionThermal() {
  const therm = thermalInfo();
  Object.assign(out, { thermal: therm });
  P(`Throttled: ${therm.throttled} · CPU speed limit: ${therm.cpu_speed_limit_pct ?? "n/a"}% · power: ${therm.power_source}`);
  P(String(therm.raw));
}

function sectionStartup() {
  const s = startupInfo();
  Object.assign(out, { startup: s });
  P(`launchd user agents: ${s.user_agents_total} total, ${s.running} running, ${(s.failed_last_exit as Json[]).length} with non-zero last exit`);
  for (const f of s.failed_last_exit as Json[]) P(`  exit=${f.last_exit}  ${f.label}`);
  P(String(s.note));
}

switch (cmd) {
  case "check": sectionCheck(); break;
  case "hogs": sectionHogs(); break;
  case "gpu": sectionGpu(); break;
  case "memory": sectionMemory(); break;
  case "disk": sectionDisk(); break;
  case "thermal": sectionThermal(); break;
  case "startup": sectionStartup(); break;
  case "full":
    sectionCheck(); P(""); sectionHogs(); P(""); sectionGpu(); P(""); sectionStartup();
    break;
  default:
    console.error(`Unknown subcommand: ${cmd}\nUsage: bun Vitals.ts [check|hogs|gpu|memory|disk|thermal|startup|full] [--json] [--top N]`);
    process.exit(2);
}

if (JSON_MODE) console.log(JSON.stringify(out, null, 2));

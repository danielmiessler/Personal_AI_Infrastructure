/**
 * PAI Installer — Electron Wrapper
 * Spawns the Bun web server, then opens a frameless window.
 * Audio autoplay is enabled (no browser restrictions).
 */

const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const fs = require("fs");

// Fix black window on Windows — GPU compositing fails on some drivers
app.disableHardwareAcceleration();

// Force autoplay at the Chromium level (belt + suspenders with webPreferences)
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const PREFERRED_PORT = parseInt(process.env.PAI_INSTALL_PORT || "41337");
const INSTALLER_DIR = path.resolve(__dirname, "..");
const LOG_FILE = path.join(INSTALLER_DIR, "installer-server.log");
const MAX_RESTARTS = 3;

let serverProcess = null;
let mainWindow = null;
let actualPort = PREFERRED_PORT;
let serverRestarts = 0;
let intentionalShutdown = false;

// ─── File Logger ────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

// ─── Single Instance Lock ────────────────────────────────────────
// Prevents launching 20 copies of the installer

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Find a free port ────────────────────────────────────────────

function findFreePort(preferred) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.listen(preferred, "127.0.0.1", () => {
      tester.close(() => resolve(preferred));
    });
    tester.on("error", () => {
      // Preferred port busy — let OS assign a free one
      const fallback = net.createServer();
      fallback.listen(0, "127.0.0.1", () => {
        const port = fallback.address().port;
        fallback.close(() => resolve(port));
      });
    });
  });
}

// ─── Wait for server to be ready ─────────────────────────────────

function waitForServer(port, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tryConnect() {
      if (Date.now() - start > timeout) {
        return reject(new Error("Server start timeout"));
      }
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        setTimeout(tryConnect, 200);
      });
      socket.once("timeout", () => {
        socket.destroy();
        setTimeout(tryConnect, 200);
      });
      socket.connect(port, "127.0.0.1");
    }
    tryConnect();
  });
}

// ─── Start Bun server ────────────────────────────────────────────

function startServer(port) {
  const mainTs = path.join(INSTALLER_DIR, "main.ts");
  log(`Starting server: bun run ${mainTs} --mode web (port ${port})`);

  serverProcess = spawn("bun", ["run", mainTs, "--mode", "web"], {
    cwd: INSTALLER_DIR,
    env: { ...process.env, PAI_INSTALL_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  serverProcess.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(data);
    try { fs.appendFileSync(LOG_FILE, text); } catch {}
  });

  serverProcess.stderr.on("data", (data) => {
    const text = data.toString();
    process.stderr.write(data);
    try { fs.appendFileSync(LOG_FILE, `[STDERR] ${text}`); } catch {}
  });

  serverProcess.on("error", (err) => {
    log(`Server spawn error: ${err.message}`);
    app.quit();
  });

  serverProcess.on("exit", (code, signal) => {
    log(`Server exited: code=${code}, signal=${signal}`);
    serverProcess = null;

    // If we're shutting down intentionally, don't restart
    if (intentionalShutdown) return;

    // ANY unexpected exit while the window is open warrants action
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (serverRestarts < MAX_RESTARTS) {
        serverRestarts++;
        log(`Auto-restart attempt ${serverRestarts}/${MAX_RESTARTS}`);

        // Show restart notice in the UI
        mainWindow.webContents.executeJavaScript(`
          (function() {
            var chat = document.getElementById('chat-messages');
            if (chat) {
              var div = document.createElement('div');
              div.className = 'msg error';
              div.textContent = 'Server connection lost (exit ${code || "clean"}). Restarting... (attempt ${serverRestarts}/${MAX_RESTARTS})';
              chat.appendChild(div);
              chat.scrollTop = chat.scrollHeight;
            }
          })();
        `).catch(() => {});

        setTimeout(() => {
          startServer(port);
          waitForServer(port, 10000).then(() => {
            log("Server restarted successfully, reloading page");
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadURL(`http://127.0.0.1:${port}/`);
            }
          }).catch((err) => {
            log(`Server restart failed: ${err.message}`);
            showFatalError(`Server could not restart: ${err.message}`);
          });
        }, 1000);
      } else {
        log(`Max restarts (${MAX_RESTARTS}) reached, showing fatal error`);
        showFatalError(
          `The installer server crashed ${MAX_RESTARTS} times. ` +
          `Check the log at:\n${LOG_FILE}`
        );
      }
    }
  });
}

// ─── Fatal Error Display ─────────────────────────────────────────

function showFatalError(message) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.executeJavaScript(`
    (function() {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;';
      overlay.innerHTML = '<div style="background:#1a1a2e;border:1px solid #e74c3c;border-radius:12px;padding:32px;max-width:500px;text-align:center;color:#fff;">' +
        '<h2 style="color:#e74c3c;margin:0 0 16px;">Server Error</h2>' +
        '<p style="color:#ccc;white-space:pre-wrap;">${message.replace(/'/g, "\\'").replace(/\n/g, "\\n")}</p>' +
        '<button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#3498db;color:#fff;border:none;border-radius:6px;cursor:pointer;">Retry</button>' +
        '</div>';
      document.body.appendChild(overlay);
    })();
  `).catch(() => {});
}

// ─── Create Window ───────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false, // Wait for content to render before showing
    backgroundColor: "#0f0f14",
    title: "PAI Installer",
    autoHideMenuBar: true,
    webPreferences: {
      autoplayPolicy: "no-user-gesture-required",
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Show window once content has rendered (prevents black flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    log("Window shown (ready-to-show)");
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    log(`Page load failed: ${errorDescription} (${errorCode}) for ${validatedURL}`);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log("Page loaded successfully");
  });

  // Forward browser console messages to terminal for debugging
  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    const levelName = ["LOG", "WARN", "ERR"][level] || "LOG";
    log(`[BROWSER ${levelName}] ${message} (${sourceId}:${line})`);
  });

  log(`Loading URL: http://127.0.0.1:${actualPort}/`);
  mainWindow.loadURL(`http://127.0.0.1:${actualPort}/`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────

app.whenReady().then(async () => {
  // Clear previous log
  try { fs.writeFileSync(LOG_FILE, `PAI Installer started at ${new Date().toISOString()}\n`); } catch {}

  actualPort = await findFreePort(PREFERRED_PORT);
  if (actualPort !== PREFERRED_PORT) {
    log(`Port ${PREFERRED_PORT} in use, using ${actualPort} instead`);
  }

  startServer(actualPort);

  try {
    await waitForServer(actualPort);
    log(`Server ready on port ${actualPort}`);
  } catch (err) {
    log(`Could not start installer server: ${err.message}`);
    app.quit();
    return;
  }

  createWindow();
});

app.on("window-all-closed", () => {
  intentionalShutdown = true;
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  intentionalShutdown = true;
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

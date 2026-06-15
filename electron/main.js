const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const http = require("http")
const { fork } = require("child_process")

let mainWindow = null
let serverProcess = null

const OLLAMA_DEFAULT = "http://127.0.0.1:11434"
const isDev = process.env.NODE_ENV === "development" || process.argv.includes("--dev")

// ── Helpers ───────────────────────────────────────────────────────────────────

function ollamaFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, OLLAMA_DEFAULT)
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: options.method || "GET",
        headers: { "Content-Type": "application/json", ...options.headers },
        timeout: options.timeout || 60000,
      },
      (res) => {
        let body = ""
        res.on("data", (chunk) => (body += chunk))
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) })
          } catch {
            resolve({ status: res.statusCode, data: body })
          }
        })
      }
    )
    req.on("error", (err) => reject(err))
    req.on("timeout", () => {
      req.destroy()
      reject(new Error("Ollama request timed out"))
    })
    if (options.body) req.write(options.body)
    req.end()
  })
}

function waitForPort(port, host, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`http://${host}:${port}`, (res) => {
        resolve(true)
      })
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}`))
        } else {
          setTimeout(check, 500)
        }
      })
      req.end()
    }
    check()
  })
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle("ollama:check", async () => {
  try {
    const res = await ollamaFetch("/api/version", { timeout: 5000 })
    return { running: res.status === 200, version: res.data?.version ?? null }
  } catch {
    return { running: false, version: null }
  }
})

ipcMain.handle("ollama:models", async () => {
  try {
    const res = await ollamaFetch("/api/tags")
    if (res.status !== 200) return []
    const models = (res.data?.models ?? []).map((m) => ({
      name: m.name,
      model: m.model,
      size: m.size,
      modified: m.modified_at,
      digest: m.digest,
      details: m.details ?? {},
    }))
    return models
  } catch {
    return []
  }
})

ipcMain.handle("ollama:chat", async (_event, params) => {
  const { model, messages, stream, format } = params
  try {
    const res = await ollamaFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        stream: stream ?? false,
        format: format ?? undefined,
        options: { num_predict: params.max_tokens ?? 2048, temperature: params.temperature ?? 0.1 },
      }),
      timeout: 120000,
    })
    if (res.status !== 200) {
      throw new Error(res.data?.error ?? `Ollama returned status ${res.status}`)
    }
    return {
      message: res.data.message,
      done: res.data.done,
      total_duration: res.data.total_duration,
    }
  } catch (err) {
    return { error: err.message }
  }
})

// ── Window management ────────────────────────────────────────────────────────

ipcMain.on("window:set-title", (_event, title) => {
  if (mainWindow) mainWindow.setTitle(title)
})
ipcMain.on("window:minimize", () => mainWindow?.minimize())
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on("window:close", () => mainWindow?.close())

// ── App lifecycle ────────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: "nodepad",
    backgroundColor: "#0d0d10",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    // Development: load from Next.js dev server
    mainWindow.loadURL("http://localhost:3000")
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else {
    // Production: start the standalone Next.js server
    const standaloneDir = path.join(__dirname, "..", ".next", "standalone")
    const serverScript = path.join(standaloneDir, "server.js")

    serverProcess = fork(serverScript, [], {
      env: { ...process.env, PORT: "3456", HOSTNAME: "127.0.0.1" },
      cwd: standaloneDir,
      stdio: "pipe",
    })

    serverProcess.stdout?.on("data", (d) => process.stdout.write(`[next] ${d}`))
    serverProcess.stderr?.on("data", (d) => process.stderr.write(`[next] ${d}`))

    await waitForPort(3456, "127.0.0.1")
    mainWindow.loadURL("http://127.0.0.1:3456")
  }

  mainWindow.once("ready-to-show", () => mainWindow.show())

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill()
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill()
})
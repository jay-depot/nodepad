const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  // ── Ollama ──────────────────────────────────────────────────────────────
  checkOllama: () => ipcRenderer.invoke("ollama:check"),
  getOllamaModels: () => ipcRenderer.invoke("ollama:models"),
  ollamaChat: (params) => ipcRenderer.invoke("ollama:chat", params),

  // ── Window management ──────────────────────────────────────────────────
  setTitle: (title) => ipcRenderer.send("window:set-title", title),
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
})
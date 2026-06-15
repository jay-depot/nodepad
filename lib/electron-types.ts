// Type declarations for Electron IPC bridge exposed via preload.js

export {}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true

      // Ollama
      checkOllama: () => Promise<{ running: boolean; version: string | null }>
      getOllamaModels: () => Promise<OllamaModelInfo[]>
      ollamaChat: (params: {
        model: string
        messages: Array<{ role: string; content: string }>
        stream?: boolean
        format?: string
        max_tokens?: number
        temperature?: number
      }) => Promise<{ message?: { content: string }; error?: string }>

      // Window
      setTitle: (title: string) => void
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}

export interface OllamaModelInfo {
  name: string
  model: string
  size: number
  modified: string
  digest: string
  details: {
    parent_model?: string
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
}
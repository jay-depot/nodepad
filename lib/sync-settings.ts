// ── Sync settings for nodepad Electron app ────────────────────────────────────
// Stored in localStorage under "nodepad-sync-settings"

import { useState, useEffect, useCallback } from "react"

export interface SyncSettings {
  enabled: boolean
  serverUrl: string
  authToken: string
}

const STORAGE_KEY = "nodepad-sync-settings"
const DEFAULTS: SyncSettings = {
  enabled: false,
  serverUrl: "ws://127.0.0.1:3001",
  authToken: "nodepad-sync-dev",
}

function loadSyncSettings(): SyncSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function useSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings>(DEFAULTS)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setSettings(loadSyncSettings())
    setIsHydrated(true)
  }, [])

  const updateSettings = useCallback((patch: Partial<SyncSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { settings, updateSettings, isHydrated }
}

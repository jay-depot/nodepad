// ── Sync client for nodepad Electron app ───────────────────────────────────────
// Connects to the nodepad-sync-server WebSocket, subscribes to a project,
// sends local ops, and applies remote ops.

export interface SyncOp {
  type:
    | "project:create" | "project:update" | "project:delete"
    | "block:create" | "block:update" | "block:delete"
    | "edge:create" | "edge:delete"
    | "subtask:create" | "subtask:update" | "subtask:delete"
    | "ghost:create" | "ghost:delete"
  payload: any
}

export interface SyncSnapshot {
  projects: any[]
  blocks: any[]
  edges: any[]
  subtasks: any[]
  ghostNotes: any[]
  lastSeq: number
}

export type SyncStatus = "disconnected" | "connecting" | "connected" | "error"

export interface SyncConfig {
  serverUrl: string
  authToken: string
  projectId: string
}

type SyncHandler = (op: SyncOp) => void
type SnapshotHandler = (snapshot: SyncSnapshot) => void
type StatusHandler = (status: SyncStatus, error?: string) => void

export class SyncClient {
  private ws: WebSocket | null = null
  private config: SyncConfig | null = null
  private status: SyncStatus = "disconnected"
  private lastSeq = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private destroyed = false

  private _onOp: SyncHandler | null = null
  private _onSnapshot: SnapshotHandler | null = null
  private _onStatusChange: StatusHandler | null = null

  connect(config: SyncConfig): void {
    if (this.ws) this.disconnect()
    this.config = config
    this.destroyed = false
    this.doConnect()
  }

  private doConnect(): void {
    if (!this.config || this.destroyed) return
    this.setStatus("connecting")

    const url = `${this.config.serverUrl}?token=${encodeURIComponent(this.config.authToken)}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      if (this.destroyed) { this.ws?.close(); return }
      this.setStatus("connected")
      // Subscribe to project
      this.ws!.send(JSON.stringify({ type: "subscribe", projectId: this.config!.projectId }))
      // Start ping
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }))
        }
      }, 30000)
    }

    this.ws.onmessage = (event) => {
      if (this.destroyed) return
      try {
        const msg = JSON.parse(event.data)
        this.handleMessage(msg)
      } catch { /* ignore malformed */ }
    }

    this.ws.onclose = () => {
      this.clearTimers()
      if (this.destroyed) return
      this.setStatus("disconnected")
      // Reconnect after 3s
      this.reconnectTimer = setTimeout(() => this.doConnect(), 3000)
    }

    this.ws.onerror = () => {
      this.setStatus("error", "WebSocket error")
    }
  }

  disconnect(): void {
    this.destroyed = true
    this.clearTimers()
    this.ws?.close()
    this.ws = null
    this.config = null
    this.setStatus("disconnected")
  }

  sendOp(op: SyncOp): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({
      type: "op",
      op,
      clientTimestamp: Date.now(),
    }))
  }

  onOpReceived(handler: SyncHandler): void { this._onOp = handler }
  onSnapshotReceived(handler: SnapshotHandler): void { this._onSnapshot = handler }
  onStatusChange(handler: StatusHandler): void { this._onStatusChange = handler }

  getStatus(): SyncStatus { return this.status }

  private handleMessage(msg: any): void {
    switch (msg.type) {
      case "snapshot":
        this.lastSeq = msg.lastSeq || 0
        this._onSnapshot?.({
          projects: msg.projects || [],
          blocks: msg.blocks || [],
          edges: msg.edges || [],
          subtasks: msg.subtasks || [],
          ghostNotes: msg.ghostNotes || [],
          lastSeq: this.lastSeq,
        })
        break

      case "op":
        this.lastSeq = msg.seq
        this._onOp?.(msg.op)
        break

      case "ack":
        // Op was persisted — nothing to do for now
        break

      case "ops":
        // Catchup ops on reconnect
        for (const opMsg of msg.ops || []) {
          this.lastSeq = opMsg.seq
          this._onOp?.(opMsg.op)
        }
        break

      case "error":
        this.setStatus("error", msg.message)
        break
    }
  }

  private setStatus(status: SyncStatus, error?: string): void {
    if (this.status === status) return
    this.status = status
    this._onStatusChange?.(status, error)
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

let _instance: SyncClient | null = null

export function getSyncClient(): SyncClient {
  if (!_instance) _instance = new SyncClient()
  return _instance
}

/**
 * Create a fresh sync client. Use this instead of getSyncClient() when you
 * need to avoid stale instance references across HMR/hot reloads.
 */
export function createSyncClient(): SyncClient {
  const client = new SyncClient()
  console.log("[sync] createSyncClient methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(client)))
  return client
}

# nodepad

**A design experiment in spatial, AI-augmented thinking.** *Hacked.*

[![Watch the intro](https://img.youtube.com/vi/jZu4sgZOOO4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jZu4sgZOOO4)

*[Watch the intro →](https://www.youtube.com/watch?v=jZu4sgZOOO4)*

---

Most AI tools are built around a chat interface: you ask, it answers, you ask again. The interaction is sequential, conversational, and optimised for producing output. nodepad is built around a different premise: that thinking is spatial and associative, and that AI is most useful when it works quietly in the background rather than at the centre of attention.

You add notes. The AI classifies them, finds connections between them, surfaces what you haven't said yet, and occasionally synthesises an emergent insight from the whole canvas. You stay in control of the space. The AI earns its place by being genuinely useful rather than prominent.

---

## This fork

This is a heavily modified fork of the original [nodepad](https://github.com/mskayyali/nodepad). What's changed:

- **Electron app** — runs as a standalone desktop application (not just a browser tab). Includes native window management, system tray, and app packaging.
- **Ollama support** — first-class provider with auto-detection of running models, connection status UI, and no API key required. Works with any local Ollama instance.
- **Sync server integration** — toggle in Settings to connect to [nodepad-sync-server](https://github.com/jay-depot/nodepad-sync-server) for real-time multi-device sync and AI-agent access via MCP.
- Removed: Umami analytics, intro video from layout, opengraph-image edge route.

All original credit goes to [Saleh Kayyali](http://mskayyali.com).

---

## How it works

Notes are typed into the input bar and placed onto a spatial canvas. Each note is automatically classified into one of 14 types — claim, question, idea, task, entity, quote, reference, definition, opinion, reflection, narrative, comparison, thesis, general — and enriched with a short annotation that adds something the note doesn't already say.

Connections between notes are inferred from content. When you hover a connection indicator, unrelated notes dim. When enough notes accumulate, a synthesis emerges — a single sentence that bridges the tensions across the canvas. You can solidify it into a thesis note or dismiss it.

Three views: **tiling** (spatial BSP grid), **kanban** (grouped by type), **graph** (force-directed, centrality-radial).

---

## Setup

### Development

```bash
git clone https://github.com/jay-depot/nodepad.git
cd nodepad
npm install
npm run electron:dev   # starts Next.js dev server + Electron
```

### Production build

```bash
npm run build
npm run start:production   # standalone Next.js server + Electron
```

### Package for distribution

```bash
npm run dist   # electron-builder — produces AppImage/deb, dmg, nsis
```

### Sync server (optional)

For multi-device sync and MCP access, run [nodepad-sync-server](https://github.com/jay-depot/nodepad-sync-server) alongside this app.

---

## Providers & Models

Select provider and model from the sidebar Settings panel. Each provider remembers its key independently — switching providers and back restores your key. Once a key is entered, the model picker fetches all models available on your account and lets you search and select any of them.

**Custom base URL**: override the provider endpoint in Settings to use local or self-hosted models (Ollama, LM Studio, vLLM, or any OpenAI-compatible API).

### Ollama *(local, no key required)*
Auto-detects running models from your local Ollama instance. Connection status shown in Settings. Pull models with `ollama pull <model>`.

| Model | Notes |
|---|---|
| `llama3.2` | Fast, good all-rounder |
| `deepseek-r1` | Strong reasoning |
| `qwen2.5` | Good structured output |
| `mistral` | Lightweight, fast |

### OpenRouter *(default)*
Access to all major models through a single key. Create a free account at [openrouter.ai](https://openrouter.ai) — use the free-tier models below with no credits, or add credits for GPT-4o, Claude, and Gemini.

| Model | Notes |
|---|---|
| `openai/gpt-4o` | Default. Strong annotation quality, web grounding. |
| `anthropic/claude-sonnet-4-5` | Strong reasoning, complex research. |
| `google/gemini-2.5-pro` | Long context, web grounding. |
| `deepseek/deepseek-chat` | Fast, cost-effective. |
| `mistralai/mistral-small-3.2` | Lightweight, fast. |

**Free tier** — no credits required, ~200 req/day limit, Nvidia-hosted, no web grounding:

| Model | Notes |
|---|---|
| `nvidia/nemotron-3-nano-30b-a3b:free` | Nemotron 30B — fast, reliable. |
| `nvidia/nemotron-3-super-120b-a12b:free` | Nemotron 120B MoE — higher quality, same speed. |

### OpenAI *(direct)*
Use your OpenAI API key directly. Web grounding via search-preview models.

| Model | Notes |
|---|---|
| `gpt-4o` | Strong structured output, web grounding. |
| `gpt-4o-mini` | Fast, capable, web grounding. |
| `gpt-4.1` | Latest GPT-4, improved instruction following. |
| `o4-mini` | Fast reasoning model. |

### Z.ai
GLM models from Zhipu AI. Get a key at [z.ai](https://z.ai/manage-apikey/apikey-list).

| Model | Notes |
|---|---|
| `glm-4.7` | Strong reasoning, 200K context. |
| `glm-5` | Z.ai flagship model. |
| `glm-5-turbo` | Fast, community-tested. |

---

## Keyboard shortcuts

| | |
|---|---|
| `Enter` | Add note |
| `⌘K` | Command palette (views, navigation, export) |
| `⌘Z` | Undo |
| `Escape` | Deselect / close panels |

Double-click any note to edit. Click the type label to reclassify manually.

---

## Data

Everything lives in your browser. No account, no server, no database.

- Notes are persisted to `localStorage` under `nodepad-projects`
- A silent rolling backup is written on every change to `nodepad-backup`
- Export to `.md` or `.nodepad` (versioned JSON) via `⌘K`
- Import `.nodepad` files via the sidebar
- With the sync server enabled, data is also mirrored to the server

---

## Tech

Next.js · React 19 · TypeScript · Tailwind CSS v4 · D3.js · Framer Motion · Electron · better-sqlite3

---

## License

[MIT](LICENSE)
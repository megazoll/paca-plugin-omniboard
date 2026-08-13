# PACA Omniboard Plugin (`com.paca.omniboard`)

> **Multi-Project Kanban Board Plugin for PACA AI (AI-Native Alternative to Jira)**

**PACA Omniboard** provides a powerful, cross-project Kanban board interface for PACA AI. It enables teams, leads, and administrators to view, filter, and manage tasks from multiple projects simultaneously in a single, unified view matching PACA's native project Kanban look & feel.

---

## 🌟 Key Features

- **Cross-Project Kanban Board**: View tasks from multiple projects on one board. Each task card displays a prominent **Project Badge** (e.g. `[CRM]`, `[DEVOPS]`) for immediate visual identification.
- **Multiple Board Support**: Create, customize, switch between, and delete multiple custom boards (e.g., "Global Sprint", "DevOps Overview", "Frontend Features").
- **Flexible Project & Column Settings**:
  - **Project Filter**: Include specific projects or select "All Projects".
  - **Column Configuration**: Add, remove, rename, reorder columns, adjust column accent colors, and map status categories (`backlog`, `todo`, `inprogress`, `done`, `cancel`) or specific status names.
- **Instant Status Synchronization**: Change a task's status from any column to update the task in PACA core Postgres database in real-time.
- **Advanced Filtering**: Search by task key (`CRM-42`), title, description, or filter by project, assignee, and priority.
- **Built with Bun & Go WASM**: Fast frontend micro-frontend compilation via Bun & Vite, powered by a Go WebAssembly plugin backend.

---

## 📁 Directory Structure

```
paca-plugin-omniboard/
├── plugin.json               # Plugin manifest (id: com.paca.omniboard, extension points, routes)
├── README.md                 # Project documentation
├── backend/                  # Go WASM backend plugin
│   ├── main.go               # WASM plugin entrypoint
│   ├── plugin.go             # Route registration & initialization
│   ├── boards.go             # Omniboard CRUD logic
│   ├── tasks.go              # Cross-project task querying & status updates
│   ├── types.go              # Domain models & database scanner helpers
│   └── migrations/           # Plugin SQL schema migrations
│       └── 0001_create_omniboard_tables.sql
├── frontend/                 # React 19 + TypeScript frontend (Bun + Vite)
│   ├── package.json          # Bun scripts & dependencies
│   ├── vite.config.ts        # Vite Module Federation setup
│   └── src/
│       ├── AdminOmniboardPage.tsx     # Admin scope entry component
│       ├── ProjectOmniboardPage.tsx   # Project scope entry component
│       ├── OmniboardIntegrationView.tsx# Board view extension component
│       ├── api.ts                     # React Query hooks
│       ├── types.ts                   # TypeScript interfaces
│       └── components/
│           ├── BoardHeader.tsx        # Board selector & search bar
│           ├── BoardSettingsModal.tsx  # Board settings & column editor modal
│           ├── KanbanBoard.tsx        # Main board grid container
│           ├── KanbanColumn.tsx       # Status column container
│           └── KanbanCard.tsx         # Task card with project badge
├── mcp/                      # Model Context Protocol (MCP) server (Bun + Vite)
│   ├── package.json
│   └── src/index.ts          # MCP tools definition
└── skills/                   # AI Agent skill definition
    └── paca-omniboard/
        └── SKILL.md
```

---

## 🚀 Quick Start & Development (using Bun)

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Go](https://golang.org/) (v1.24+)

---

### 1. Frontend Development

All package management and script execution MUST use **`bun`**:

```bash
cd frontend

# Install dependencies with Bun
bun install

# Run type check
bun run typecheck

# Start development build mode (watches files)
bun run dev

# Production build (outputs remoteEntry.js to dist/)
bun run build
```

---

### 2. Backend WASM Plugin Compilation

The backend compiles to WebAssembly (`wasip1` / `wasm` target):

```bash
cd backend

# Compile Go code into plugin.wasm
GOOS=wasip1 GOARCH=wasm go build -o plugin.wasm .
```

---

### 3. MCP Server Build

```bash
cd mcp

# Install dependencies with Bun
bun install

# Build MCP bundle
bun run build
```

---

## 🛠️ Database Schema

Omniboard configurations are stored in the plugin's isolated Postgres schema (`plugin_data_com_paca_omniboard`):

```sql
CREATE TABLE IF NOT EXISTS omniboards (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID        REFERENCES projects(id) ON DELETE CASCADE,
    scope         TEXT        NOT NULL CHECK (scope IN ('project', 'admin', 'integration')),
    name          TEXT        NOT NULL DEFAULT 'Omniboard',
    description   TEXT        NOT NULL DEFAULT '',
    project_ids   JSONB       NOT NULL DEFAULT '[]'::jsonb,
    column_config JSONB       NOT NULL DEFAULT '[]'::jsonb,
    filters       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_by    UUID        REFERENCES project_members(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Live task data, project info, and task statuses are queried directly from PACA core tables (`projects`, `tasks`, `task_statuses`, `users`).

---

## 🔌 API Routes Reference

### Project-Scoped Routes (`/projects/:projectId/omniboard/...`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/projects/:projectId/omniboard/boards` | List omniboards visible to project |
| `POST` | `/projects/:projectId/omniboard/boards` | Create a new board |
| `GET` | `/projects/:projectId/omniboard/boards/:boardId` | Get board configuration |
| `PATCH` | `/projects/:projectId/omniboard/boards/:boardId` | Update board settings / columns |
| `DELETE` | `/projects/:projectId/omniboard/boards/:boardId` | Delete a board |
| `GET` | `/projects/:projectId/omniboard/projects` | List active PACA projects |
| `GET` | `/projects/:projectId/omniboard/statuses` | List task statuses across projects |
| `GET` | `/projects/:projectId/omniboard/boards/:boardId/tasks` | Fetch tasks across selected projects |
| `PATCH` | `/projects/:projectId/omniboard/tasks/:taskId/status` | Move task to a new status |

### Global / Admin-Scoped Routes (`/omniboard/admin-...`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/omniboard/admin-boards` | List instance-wide admin boards |
| `POST` | `/omniboard/admin-boards` | Create a global admin board |
| `GET` | `/omniboard/admin-boards/:boardId` | Get admin board by ID |
| `PATCH` | `/omniboard/admin-boards/:boardId` | Update admin board |
| `DELETE` | `/omniboard/admin-boards/:boardId` | Delete admin board |
| `GET` | `/omniboard/admin-projects` | List all projects across instance |
| `GET` | `/omniboard/admin-statuses` | List all statuses across instance |
| `GET` | `/omniboard/admin-boards/:boardId/tasks` | Fetch tasks across instance projects |
| `PATCH` | `/omniboard/admin-tasks/:taskId/status` | Update task status |

---

## 🤖 AI Agent MCP Tools & Skill

The plugin exposes tools for AI agents (via PACA MCP runtime):

- `omniboard_list_boards`: List custom Kanban boards.
- `omniboard_get_tasks`: Fetch cross-project tasks for a board.
- `omniboard_move_task_status`: Update task status across projects.

Skill file location: `skills/paca-omniboard/SKILL.md`.

---

## 📜 License

Apache License 2.0

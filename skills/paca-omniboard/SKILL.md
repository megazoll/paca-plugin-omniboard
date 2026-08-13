---
name: paca-omniboard
description: Multi-project Kanban board manager for PACA AI (Omniboard plugin). Allows viewing, searching, creating custom boards, and updating task statuses across projects.
---

# PACA Omniboard (Multi-Project Kanban Plugin)

Omniboard allows viewing and managing tasks across multiple PACA projects in a unified Kanban interface.

## Bun Development Workflow

All frontend and MCP actions must be executed using **`bun`**:

```bash
# Frontend
cd frontend
bun install
bun run dev
bun run build

# MCP Server
cd mcp
bun install
bun run build

# Backend WASM Plugin
cd backend
GOOS=wasip1 GOARCH=wasm go build -o plugin.wasm .
```

## Available MCP Tools

- `omniboard_list_boards` — List all custom Omniboards.
- `omniboard_get_tasks` — Fetch tasks across multiple projects for a specific board.
- `omniboard_move_task_status` — Update task status.

## Board Configuration Model

- **Project Selection**: `project_ids: ["uuid-1", "uuid-2"]` (or empty for all projects).
- **Column Mapping**: Columns map statuses by `status_categories` (`backlog`, `todo`, `inprogress`, `done`, `cancel`) or specific status names.

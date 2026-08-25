package main

import (
	"time"

	plugin "github.com/Paca-AI/plugin-sdk-go"
)

func nowStr() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}

// omniboardPlugin implements plugin.Plugin.
type omniboardPlugin struct {
	db    *plugin.DB
	cache *plugin.Cache
	log   *plugin.Logger
}

// Init registers all routes on the provided context.
func (p *omniboardPlugin) Init(ctx *plugin.Context) error {
	p.db = ctx.DB()
	p.cache = ctx.Cache()
	p.log = ctx.Log()

	// ── Project-scope routes ───────────────────────────────────────────────
	ctx.Route("GET", "/projects/:projectId/omniboard/boards", p.listBoards)
	ctx.Route("POST", "/projects/:projectId/omniboard/boards", p.createBoard)
	ctx.Route("GET", "/projects/:projectId/omniboard/boards/:boardId", p.getBoard)
	ctx.Route("PATCH", "/projects/:projectId/omniboard/boards/:boardId", p.updateBoard)
	ctx.Route("DELETE", "/projects/:projectId/omniboard/boards/:boardId", p.deleteBoard)
	ctx.Route("GET", "/projects/:projectId/omniboard/projects", p.listProjects)
	ctx.Route("GET", "/projects/:projectId/omniboard/statuses", p.listStatuses)
	ctx.Route("GET", "/projects/:projectId/omniboard/task-types", p.listTaskTypes)
	ctx.Route("GET", "/projects/:projectId/omniboard/members", p.listMembers)
	ctx.Route("GET", "/projects/:projectId/omniboard/boards/:boardId/tasks", p.getBoardTasks)
	ctx.Route("POST", "/projects/:projectId/omniboard/tasks", p.createTask)
	ctx.Route("PATCH", "/projects/:projectId/omniboard/tasks/:taskId/status", p.updateTaskStatus)
	ctx.Route("PATCH", "/projects/:projectId/omniboard/tasks/:taskId/type", p.updateTaskType)
	ctx.Route("PATCH", "/projects/:projectId/omniboard/tasks/:taskId/description", p.updateTaskDescription)
	ctx.Route("PATCH", "/projects/:projectId/omniboard/tasks/:taskId/assignees", p.updateTaskAssignees)

	// ── Admin-scope routes ──────────────────────────────────────────────────
	ctx.Route("GET", "/omniboard/admin-boards", p.listBoards)
	ctx.Route("POST", "/omniboard/admin-boards", p.createBoard)
	ctx.Route("GET", "/omniboard/admin-boards/:boardId", p.getBoard)
	ctx.Route("PATCH", "/omniboard/admin-boards/:boardId", p.updateBoard)
	ctx.Route("DELETE", "/omniboard/admin-boards/:boardId", p.deleteBoard)
	ctx.Route("GET", "/omniboard/admin-projects", p.listProjects)
	ctx.Route("GET", "/omniboard/admin-statuses", p.listStatuses)
	ctx.Route("GET", "/omniboard/admin-task-types", p.listTaskTypes)
	ctx.Route("GET", "/omniboard/admin-members", p.listMembers)
	ctx.Route("GET", "/omniboard/admin-boards/:boardId/tasks", p.getBoardTasks)
	ctx.Route("POST", "/omniboard/admin-tasks", p.createTask)
	ctx.Route("PATCH", "/omniboard/admin-tasks/:taskId/status", p.updateTaskStatus)
	ctx.Route("PATCH", "/omniboard/admin-tasks/:taskId/type", p.updateTaskType)
	ctx.Route("PATCH", "/omniboard/admin-tasks/:taskId/description", p.updateTaskDescription)
	ctx.Route("PATCH", "/omniboard/admin-tasks/:taskId/assignees", p.updateTaskAssignees)

	return nil
}

func (p *omniboardPlugin) Shutdown() {}

type envelope struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}

func ok(res *plugin.Response, data any) {
	res.JSON(200, envelope{Success: true, Data: data})
}

func created(res *plugin.Response, data any) {
	res.JSON(201, envelope{Success: true, Data: data})
}

func nullableUUID(id string) any {
	if id == "" {
		return nil
	}
	return id
}

// plugin_test.go — unit tests for the omniboard plugin
package main

import (
	"encoding/json"
	"testing"

	plugin "github.com/Paca-AI/plugin-sdk-go"
	"github.com/Paca-AI/plugin-sdk-go/plugintest"
)

const testProjectID = "project-1"

func setupPlugin(t *testing.T) *plugintest.Context {
	t.Helper()
	tc := plugintest.NewContext(t)

	tc.DB.SeedRows("omniboards",
		[]string{"id", "project_id", "scope", "name", "description", "project_ids", "column_config", "filters", "created_by", "created_at", "updated_at"},
		[][]any{
			{"board-1", testProjectID, "project", "Main Omniboard", "Multi-project Kanban board", "[]", "[]", "{}", "user-1", "2026-08-01T00:00:00Z", "2026-08-01T00:00:00Z"},
		},
	)
	tc.DB.SeedRows("projects",
		[]string{"id", "name", "description", "task_id_prefix"},
		[][]any{
			{testProjectID, "Project One", "First test project", "P1"},
			{"project-2", "Project Two", "Second test project", "P2"},
		},
	)
	tc.DB.SeedRows("task_statuses",
		[]string{"id", "project_id", "name", "color", "category", "position", "is_default"},
		[][]any{
			{"status-todo", testProjectID, "To Do", "#eab308", "todo", 1, true},
			{"status-done", testProjectID, "Done", "#22c55e", "done", 2, false},
		},
	)
	tc.DB.SeedRows("tasks",
		[]string{"id", "project_id", "task_number", "title", "description", "status_id", "assignee_id", "priority", "created_at", "updated_at"},
		[][]any{
			{"task-1", testProjectID, 1, "First task", "Task description 1", "status-todo", "user-1", "high", "2026-08-01T00:00:00Z", "2026-08-01T00:00:00Z"},
			{"task-2", testProjectID, 2, "Second task", "Task description 2", "status-done", nil, "medium", "2026-08-02T00:00:00Z", "2026-08-02T00:00:00Z"},
		},
	)

	var p omniboardPlugin
	if err := p.Init(tc.PluginContext()); err != nil {
		t.Fatal("Init failed:", err)
	}
	return tc
}

func callerReq() plugintest.Request {
	return plugintest.Request{
		Caller: plugin.CallerIdentity{
			ProjectID:  testProjectID,
			CallerID:   "user-1",
			CallerRole: "PROJECT_MEMBER",
		},
		PathParams: map[string]string{},
	}
}

func decodeData[T any](t *testing.T, res *plugin.Response) T {
	t.Helper()
	var env struct {
		Data T `json:"data"`
	}
	if err := json.Unmarshal(res.Body, &env); err != nil {
		t.Fatalf("failed to decode response body %s: %v", res.BodyString(), err)
	}
	return env.Data
}

func TestListBoards(t *testing.T) {
	tc := setupPlugin(t)

	res := tc.Call("GET", "/projects/"+testProjectID+"/omniboard/boards", callerReq())
	if res.StatusCode != 200 {
		t.Fatalf("expected status 200, got %d: %s", res.StatusCode, res.BodyString())
	}

	boards := decodeData[[]Omniboard](t, res)
	if len(boards) != 1 {
		t.Fatalf("expected 1 board, got %d", len(boards))
	}
	if boards[0].Name != "Main Omniboard" {
		t.Errorf("expected 'Main Omniboard', got %q", boards[0].Name)
	}
}

func TestCreateBoard(t *testing.T) {
	tc := setupPlugin(t)

	createReq := callerReq()
	createReq.Body = []byte(`{"name":"Sprint Board","scope":"project","project_ids":["project-1"]}`)
	res := tc.Call("POST", "/projects/"+testProjectID+"/omniboard/boards", createReq)
	if res.StatusCode != 201 {
		t.Fatalf("expected 201 created, got %d: %s", res.StatusCode, res.BodyString())
	}
	createdBoard := decodeData[Omniboard](t, res)
	if createdBoard.Name != "Sprint Board" {
		t.Errorf("expected name 'Sprint Board', got %q", createdBoard.Name)
	}
}

func TestGetBoardTasks(t *testing.T) {
	tc := setupPlugin(t)

	resBoards := tc.Call("GET", "/projects/"+testProjectID+"/omniboard/boards", callerReq())
	boards := decodeData[[]Omniboard](t, resBoards)
	boardID := boards[0].ID

	tasksReq := callerReq()
	tasksReq.PathParams = map[string]string{"boardId": boardID}
	resTasks := tc.Call("GET", "/projects/"+testProjectID+"/omniboard/boards/"+boardID+"/tasks", tasksReq)
	if resTasks.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resTasks.StatusCode, resTasks.BodyString())
	}

	tasks := decodeData[[]CrossProjectTask](t, resTasks)
	if len(tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(tasks))
	}
}

func TestGetBoardTasks_WithoutAssigneeIDColumn(t *testing.T) {
	tc := plugintest.NewContext(t)

	tc.DB.SeedRows("omniboards",
		[]string{"id", "project_id", "scope", "name", "description", "project_ids", "column_config", "filters", "created_by", "created_at", "updated_at"},
		[][]any{
			{"board-2", testProjectID, "project", "Omniboard 2", "Board without assignee_id on tasks", "[]", "[]", "{}", "user-1", "2026-08-01T00:00:00Z", "2026-08-01T00:00:00Z"},
		},
	)
	tc.DB.SeedRows("projects",
		[]string{"id", "name", "description", "task_id_prefix"},
		[][]any{
			{testProjectID, "Project One", "First test project", "P1"},
		},
	)
	tc.DB.SeedRows("task_statuses",
		[]string{"id", "project_id", "name", "color", "category", "position", "is_default"},
		[][]any{
			{"status-todo", testProjectID, "To Do", "#eab308", "todo", 1, true},
		},
	)
	tc.DB.SeedRows("users",
		[]string{"id", "username", "full_name"},
		[][]any{
			{"user-1", "jdoe", "John Doe"},
		},
	)
	tc.DB.SeedRows("project_members",
		[]string{"id", "project_id", "user_id"},
		[][]any{
			{"pm-1", testProjectID, "user-1"},
		},
	)
	// tasks table without assignee_id, using importance
	tc.DB.SeedRows("tasks",
		[]string{"id", "project_id", "task_number", "title", "description", "status_id", "importance", "created_at", "updated_at"},
		[][]any{
			{"task-1", testProjectID, 1, "PACA task", "Task desc", "status-todo", 2, "2026-08-01T00:00:00Z", "2026-08-01T00:00:00Z"},
		},
	)
	tc.DB.SeedRows("task_assignees",
		[]string{"task_id", "member_id"},
		[][]any{
			{"task-1", "pm-1"},
		},
	)

	var p omniboardPlugin
	if err := p.Init(tc.PluginContext()); err != nil {
		t.Fatal("Init failed:", err)
	}

	tasksReq := callerReq()
	tasksReq.PathParams = map[string]string{"boardId": "board-2"}
	resTasks := tc.Call("GET", "/projects/"+testProjectID+"/omniboard/boards/board-2/tasks", tasksReq)
	t.Logf("Response: %s", resTasks.BodyString())
	if resTasks.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resTasks.StatusCode, resTasks.BodyString())
	}

	tasks := decodeData[[]CrossProjectTask](t, resTasks)
	if len(tasks) != 1 {
		t.Fatalf("expected 1 task, got %d", len(tasks))
	}
	if tasks[0].Title != "PACA task" {
		t.Errorf("expected title 'PACA task', got %q", tasks[0].Title)
	}
}



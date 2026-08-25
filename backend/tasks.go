package main

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	plugin "github.com/Paca-AI/plugin-sdk-go"
)

// listProjects returns all active projects in PACA core.
func (p *omniboardPlugin) listProjects(req *plugin.Request, res *plugin.Response) {
	query := `SELECT id, name, COALESCE(description::text, '') AS description, task_id_prefix FROM projects ORDER BY name ASC`
	rows, err := p.db.Query(query)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to query projects: %v", err)})
		return
	}

	projects := make([]ProjectItem, 0, len(rows.Rows))
	for _, r := range rows.Rows {
		sc := newRowScanner(rows.Columns, r)
		projects = append(projects, ProjectItem{
			ID:           sc.str("id"),
			Name:         sc.str("name"),
			Description:  sc.str("description"),
			TaskIDPrefix: sc.str("task_id_prefix"),
		})
	}

	ok(res, projects)
}

// listStatuses returns all task statuses across PACA projects.
func (p *omniboardPlugin) listStatuses(req *plugin.Request, res *plugin.Response) {
	query := `
		SELECT id, project_id, name, color, category, position, is_default
		FROM task_statuses
		ORDER BY position ASC, name ASC
	`
	rows, err := p.db.Query(query)
	if err != nil {
		// Try fallback column name "default" if "is_default" fails
		query = `SELECT id, project_id, name, color, category, position, "default" AS is_default FROM task_statuses ORDER BY position ASC, name ASC`
		rows, err = p.db.Query(query)
	}

	statuses := make([]StatusItem, 0)
	if err == nil && rows != nil {
		for _, r := range rows.Rows {
			sc := newRowScanner(rows.Columns, r)
			statuses = append(statuses, StatusItem{
				ID:        sc.str("id"),
				ProjectID: sc.str("project_id"),
				Name:      sc.str("name"),
				Color:     sc.str("color"),
				Category:  sc.str("category"),
				Position:  sc.intVal("position"),
				IsDefault: sc.boolVal("is_default"),
			})
		}
	}

	ok(res, statuses)
}

// getBoardTasks queries cross-project tasks for a specific board based on its project filters.
func (p *omniboardPlugin) getBoardTasks(req *plugin.Request, res *plugin.Response) {
	boardID := req.PathParam("boardId")

	// Get board config
	rows, err := p.db.Query(`SELECT id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at FROM omniboards WHERE id = $1`, boardID)
	if err != nil || len(rows.Rows) == 0 {
		res.JSON(404, map[string]any{"error": "board not found"})
		return
	}
	board := parseBoardRows(rows)[0]

	type assigneeStrategy int
	const (
		assigneeTaskAssigneesMember assigneeStrategy = iota
		assigneeTaskAssigneesProjectMember
		assigneeTaskAssigneesUser
		assigneeTasksAssigneeID
		assigneeNone
	)

	type queryConfig struct {
		assigneeStrategy assigneeStrategy
		useImportance    bool
		qualifyID        bool
		filterDeleted    bool
	}

	buildQuery := func(cfg queryConfig) (string, []any) {
		prioritySelect := "COALESCE(t.priority, 'none') AS priority"
		if cfg.useImportance {
			prioritySelect = `CASE 
				WHEN t.importance >= 100 THEN 'urgent' 
				WHEN t.importance >= 50 THEN 'high' 
				WHEN t.importance >= 20 THEN 'medium' 
				WHEN t.importance >= 1 THEN 'low' 
				ELSE 'none' 
			END AS priority`
		}

		var assigneeIDSelect, assigneeNameSelect, assigneesSelect, extraJoin string
		switch cfg.assigneeStrategy {
		case assigneeTaskAssigneesMember:
			assigneeIDSelect = "(SELECT ta.member_id::text FROM task_assignees ta WHERE ta.task_id = t.id LIMIT 1) AS assignee_id"
			assigneeNameSelect = "(SELECT COALESCE(NULLIF(u.full_name, ''), u.username, '') FROM task_assignees ta JOIN project_members pm ON ta.member_id = pm.id JOIN users u ON pm.user_id = u.id WHERE ta.task_id = t.id LIMIT 1) AS assignee_name"
			assigneesSelect = `COALESCE((
				SELECT json_agg(json_build_object(
					'id', ta.member_id::text,
					'name', COALESCE(NULLIF(u.full_name, ''), u.username, '')
				))
				FROM task_assignees ta
				JOIN project_members pm ON ta.member_id = pm.id
				JOIN users u ON pm.user_id = u.id
				WHERE ta.task_id = t.id
			), '[]'::json)::text AS assignees_json`
		case assigneeTaskAssigneesProjectMember:
			assigneeIDSelect = "(SELECT ta.project_member_id::text FROM task_assignees ta WHERE ta.task_id = t.id LIMIT 1) AS assignee_id"
			assigneeNameSelect = "(SELECT COALESCE(NULLIF(u.full_name, ''), u.username, '') FROM task_assignees ta JOIN project_members pm ON ta.project_member_id = pm.id JOIN users u ON pm.user_id = u.id WHERE ta.task_id = t.id LIMIT 1) AS assignee_name"
			assigneesSelect = `COALESCE((
				SELECT json_agg(json_build_object(
					'id', ta.project_member_id::text,
					'name', COALESCE(NULLIF(u.full_name, ''), u.username, '')
				))
				FROM task_assignees ta
				JOIN project_members pm ON ta.project_member_id = pm.id
				JOIN users u ON pm.user_id = u.id
				WHERE ta.task_id = t.id
			), '[]'::json)::text AS assignees_json`
		case assigneeTaskAssigneesUser:
			assigneeIDSelect = "(SELECT ta.user_id::text FROM task_assignees ta WHERE ta.task_id = t.id LIMIT 1) AS assignee_id"
			assigneeNameSelect = "(SELECT COALESCE(NULLIF(u.full_name, ''), u.username, '') FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id LIMIT 1) AS assignee_name"
			assigneesSelect = `COALESCE((
				SELECT json_agg(json_build_object(
					'id', ta.user_id::text,
					'name', COALESCE(NULLIF(u.full_name, ''), u.username, '')
				))
				FROM task_assignees ta
				JOIN users u ON ta.user_id = u.id
				WHERE ta.task_id = t.id
			), '[]'::json)::text AS assignees_json`
		case assigneeTasksAssigneeID:
			assigneeIDSelect = "COALESCE(pm.id::text, t.assignee_id::text) AS assignee_id"
			assigneeNameSelect = "COALESCE(NULLIF(u_pm.full_name, ''), u_pm.username, NULLIF(u.full_name, ''), u.username, '') AS assignee_name"
			assigneesSelect = `COALESCE((
				SELECT json_agg(json_build_object(
					'id', COALESCE(pm2.id::text, t2.assignee_id::text),
					'name', COALESCE(NULLIF(u_pm2.full_name, ''), u_pm2.username, NULLIF(u2.full_name, ''), u2.username, '')
				))
				FROM tasks t2
				LEFT JOIN project_members pm2 ON t2.assignee_id = pm2.id
				LEFT JOIN users u_pm2 ON pm2.user_id = u_pm2.id
				LEFT JOIN users u2 ON t2.assignee_id = u2.id
				WHERE t2.id = t.id AND t2.assignee_id IS NOT NULL
			), '[]'::json)::text AS assignees_json`
			extraJoin = "LEFT JOIN project_members pm ON t.assignee_id = pm.id LEFT JOIN users u_pm ON pm.user_id = u_pm.id LEFT JOIN users u ON t.assignee_id = u.id"
		case assigneeNone:
			assigneeIDSelect = "NULL AS assignee_id"
			assigneeNameSelect = "'' AS assignee_name"
			assigneesSelect = "'[]'::text AS assignees_json"
		}

		whereID := "WHERE t.id IS NOT NULL"
		if !cfg.qualifyID {
			whereID = "WHERE id IS NOT NULL"
		}
		if cfg.filterDeleted {
			whereID = "WHERE t.deleted_at IS NULL"
			if !cfg.qualifyID {
				whereID = "WHERE deleted_at IS NULL"
			}
		}

		baseSQL := fmt.Sprintf(`SELECT t.id, t.project_id, p.name AS project_name, p.task_id_prefix AS project_prefix, t.task_number, t.title, COALESCE(t.description::text, '') AS description, t.status_id, COALESCE(ts.name, '') AS status_name, COALESCE(ts.category, '') AS status_category, COALESCE(ts.color, '#64748b') AS status_color, %s, %s, %s, %s, t.parent_task_id::text AS parent_task_id, t.created_at, t.updated_at FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN task_statuses ts ON t.status_id = ts.id %s %s`,
			assigneeIDSelect, assigneeNameSelect, assigneesSelect, prioritySelect, extraJoin, whereID)

		sqlParts := []string{baseSQL}
		args := []any{}
		argIdx := 1

		// Filter by project_ids if specified on board
		if len(board.ProjectIDs) > 0 {
			placeholders := make([]string, len(board.ProjectIDs))
			for i, pid := range board.ProjectIDs {
				placeholders[i] = fmt.Sprintf("$%d", argIdx)
				args = append(args, pid)
				argIdx++
			}
			sqlParts = append(sqlParts, fmt.Sprintf("AND t.project_id IN (%s)", strings.Join(placeholders, ", ")))
		}

		// Filter by search query if provided in request params
		searchQ := req.QueryParam("search")
		if searchQ != "" {
			sqlParts = append(sqlParts, fmt.Sprintf("AND (t.title ILIKE $%d OR t.description::text ILIKE $%d OR CONCAT(p.task_id_prefix, '-', t.task_number) ILIKE $%d)", argIdx, argIdx, argIdx))
			args = append(args, "%"+searchQ+"%")
			argIdx++
		}

		// Filter by project if provided in query params
		filterProj := req.QueryParam("projectId")
		if filterProj != "" {
			sqlParts = append(sqlParts, fmt.Sprintf("AND t.project_id = $%d", argIdx))
			args = append(args, filterProj)
			argIdx++
		}

		// Filter out subtasks if hide_subtasks is enabled on board or requested
		hideSubtasks := false
		if hs, ok := board.Filters["hide_subtasks"].(bool); ok && hs {
			hideSubtasks = true
		}
		if req.QueryParam("hideSubtasks") == "true" {
			hideSubtasks = true
		}
		if hideSubtasks {
			sqlParts = append(sqlParts, "AND t.parent_task_id IS NULL")
		}

		// Filter out old completed tasks if done_retention_days is configured
		var doneRetentionDays int
		if d, ok := board.Filters["done_retention_days"].(float64); ok && d > 0 {
			doneRetentionDays = int(d)
		}
		if dStr := req.QueryParam("doneRetentionDays"); dStr != "" {
			if dInt, err := strconv.Atoi(dStr); err == nil && dInt > 0 {
				doneRetentionDays = dInt
			}
		}
		if doneRetentionDays > 0 {
			sqlParts = append(sqlParts, fmt.Sprintf("AND (COALESCE(ts.category, '') NOT IN ('done', 'completed', 'closed', 'resolved') OR t.updated_at >= NOW() - INTERVAL '%d days')", doneRetentionDays))
		}

		// Filter by assignee if provided in query params
		filterAssignee := req.QueryParam("assigneeId")
		if filterAssignee != "" {
			if filterAssignee == "unassigned" {
				switch cfg.assigneeStrategy {
				case assigneeTaskAssigneesMember, assigneeTaskAssigneesProjectMember, assigneeTaskAssigneesUser:
					sqlParts = append(sqlParts, "AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id)")
				case assigneeTasksAssigneeID:
					sqlParts = append(sqlParts, "AND t.assignee_id IS NULL")
				}
			} else {
				switch cfg.assigneeStrategy {
				case assigneeTaskAssigneesMember:
					sqlParts = append(sqlParts, fmt.Sprintf("AND EXISTS (SELECT 1 FROM task_assignees ta JOIN project_members pm ON ta.member_id = pm.id LEFT JOIN users u ON pm.user_id = u.id WHERE ta.task_id = t.id AND (pm.user_id::text = $%d OR ta.member_id::text = $%d OR u.full_name = $%d OR u.username = $%d))", argIdx, argIdx, argIdx, argIdx))
					args = append(args, filterAssignee)
					argIdx++
				case assigneeTaskAssigneesProjectMember:
					sqlParts = append(sqlParts, fmt.Sprintf("AND EXISTS (SELECT 1 FROM task_assignees ta JOIN project_members pm ON ta.project_member_id = pm.id LEFT JOIN users u ON pm.user_id = u.id WHERE ta.task_id = t.id AND (pm.user_id::text = $%d OR ta.project_member_id::text = $%d OR u.full_name = $%d OR u.username = $%d))", argIdx, argIdx, argIdx, argIdx))
					args = append(args, filterAssignee)
					argIdx++
				case assigneeTaskAssigneesUser:
					sqlParts = append(sqlParts, fmt.Sprintf("AND EXISTS (SELECT 1 FROM task_assignees ta LEFT JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id AND (ta.user_id::text = $%d OR u.full_name = $%d OR u.username = $%d))", argIdx, argIdx, argIdx))
					args = append(args, filterAssignee)
					argIdx++
				case assigneeTasksAssigneeID:
					sqlParts = append(sqlParts, fmt.Sprintf("AND (t.assignee_id::text = $%d OR pm.user_id::text = $%d OR u_pm.full_name = $%d OR u_pm.username = $%d OR u.full_name = $%d OR u.username = $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx))
					args = append(args, filterAssignee)
					argIdx++
				}
			}
		}

		// Filter by priority if provided in query params
		filterPriority := req.QueryParam("priority")
		if filterPriority != "" {
			if cfg.useImportance {
				switch strings.ToLower(filterPriority) {
				case "urgent", "critical":
					sqlParts = append(sqlParts, "AND t.importance >= 100")
				case "high":
					sqlParts = append(sqlParts, "AND (t.importance >= 50 AND t.importance < 100)")
				case "medium":
					sqlParts = append(sqlParts, "AND (t.importance >= 20 AND t.importance < 50)")
				case "low":
					sqlParts = append(sqlParts, "AND (t.importance >= 1 AND t.importance < 20)")
				case "none":
					sqlParts = append(sqlParts, "AND (t.importance <= 0 OR t.importance IS NULL)")
				}
			} else {
				sqlParts = append(sqlParts, fmt.Sprintf("AND t.priority = $%d", argIdx))
				args = append(args, filterPriority)
				argIdx++
			}
		}

		return strings.Join(sqlParts, " "), args
	}

	assigneeStrategies := []assigneeStrategy{
		assigneeTaskAssigneesMember,
		assigneeTaskAssigneesProjectMember,
		assigneeTaskAssigneesUser,
		assigneeTasksAssigneeID,
		assigneeNone,
	}

	var attempts []queryConfig
	for _, strat := range assigneeStrategies {
		for _, del := range []bool{true, false} {
			for _, imp := range []bool{true, false} {
				for _, qual := range []bool{true, false} {
					attempts = append(attempts, queryConfig{
						assigneeStrategy: strat,
						useImportance:    imp,
						qualifyID:        qual,
						filterDeleted:    del,
					})
				}
			}
		}
	}

	var taskRows *plugin.DBQueryResult
	for _, att := range attempts {
		q, args := buildQuery(att)
		taskRows, err = p.db.Query(q, args...)
		if err == nil && taskRows != nil {
			break
		}
	}

	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to fetch tasks: %v", err)})
		return
	}

	tasks := make([]CrossProjectTask, 0)
	if taskRows != nil {
		for _, r := range taskRows.Rows {
			sc := newRowScanner(taskRows.Columns, r)

			var rawAssignees []TaskAssignee
			if err := sc.jsonVal("assignees_json", &rawAssignees); err != nil {
				rawAssignees = nil
			}

			assignees := make([]TaskAssignee, 0)
			for _, a := range rawAssignees {
				if a.ID != "" || a.Name != "" {
					assignees = append(assignees, a)
				}
			}

			if len(assignees) == 0 && sc.str("assignee_name") != "" {
				assignees = []TaskAssignee{
					{
						ID:   sc.str("assignee_id"),
						Name: sc.str("assignee_name"),
					},
				}
			}

			// Ensure assignee_id and assignee_name are populated from first assignee if available
			var assigneeID *string = sc.strPtr("assignee_id")
			var assigneeName string = sc.str("assignee_name")
			if len(assignees) > 0 {
				if assigneeID == nil || *assigneeID == "" {
					firstID := assignees[0].ID
					assigneeID = &firstID
				}
				if assigneeName == "" {
					assigneeName = assignees[0].Name
				}
			}

			tasks = append(tasks, CrossProjectTask{
				ID:             sc.str("id"),
				ProjectID:      sc.str("project_id"),
				ProjectName:    sc.str("project_name"),
				ProjectPrefix:  sc.str("project_prefix"),
				TaskNumber:     sc.intVal("task_number"),
				Title:          sc.str("title"),
				Description:    sc.str("description"),
				StatusID:       sc.strPtr("status_id"),
				StatusName:     sc.str("status_name"),
				StatusCategory: sc.str("status_category"),
				StatusColor:    sc.str("status_color"),
				AssigneeID:     assigneeID,
				AssigneeName:   assigneeName,
				Assignees:      assignees,
				Priority:       sc.str("priority"),
				ParentTaskID:   sc.strPtr("parent_task_id"),
				CreatedAt:      sc.str("created_at"),
				UpdatedAt:      sc.str("updated_at"),
			})
		}
	}

	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].UpdatedAt > tasks[j].UpdatedAt
	})

	ok(res, tasks)
}

// listMembers returns project members across projects or for a specific project.
func (p *omniboardPlugin) listMembers(req *plugin.Request, res *plugin.Response) {
	projID := req.QueryParam("projectId")
	if projID == "" {
		projID = req.PathParam("projectId")
	}

	var rows *plugin.DBQueryResult
	var err error

	queries := []struct {
		sql  string
		args []any
	}{
		{
			sql: func() string {
				if projID != "" {
					return `SELECT pm.id, pm.project_id, pm.user_id, COALESCE(NULLIF(u.full_name, ''), u.username, '') AS name, COALESCE(u.username, '') AS username FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1 AND pm.deleted_at IS NULL ORDER BY name ASC`
				}
				return `SELECT pm.id, pm.project_id, pm.user_id, COALESCE(NULLIF(u.full_name, ''), u.username, '') AS name, COALESCE(u.username, '') AS username FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.deleted_at IS NULL ORDER BY name ASC`
			}(),
			args: func() []any {
				if projID != "" {
					return []any{projID}
				}
				return nil
			}(),
		},
		{
			sql: func() string {
				if projID != "" {
					return `SELECT pm.id, pm.project_id, pm.user_id, COALESCE(NULLIF(u.full_name, ''), u.username, '') AS name, COALESCE(u.username, '') AS username FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1 ORDER BY name ASC`
				}
				return `SELECT pm.id, pm.project_id, pm.user_id, COALESCE(NULLIF(u.full_name, ''), u.username, '') AS name, COALESCE(u.username, '') AS username FROM project_members pm JOIN users u ON pm.user_id = u.id ORDER BY name ASC`
			}(),
			args: func() []any {
				if projID != "" {
					return []any{projID}
				}
				return nil
			}(),
		},
		{
			sql: func() string {
				if projID != "" {
					return `SELECT pm.id, pm.project_id, pm.user_id, COALESCE(u.full_name, u.username, '') AS name, COALESCE(u.username, '') AS username FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1`
				}
				return `SELECT pm.id, pm.project_id, pm.user_id, COALESCE(u.full_name, u.username, '') AS name, COALESCE(u.username, '') AS username FROM project_members pm JOIN users u ON pm.user_id = u.id`
			}(),
			args: func() []any {
				if projID != "" {
					return []any{projID}
				}
				return nil
			}(),
		},
		{
			sql: func() string {
				if projID != "" {
					return `SELECT id, project_id, user_id FROM project_members WHERE project_id = $1`
				}
				return `SELECT id, project_id, user_id FROM project_members`
			}(),
			args: func() []any {
				if projID != "" {
					return []any{projID}
				}
				return nil
			}(),
		},
	}

	for _, q := range queries {
		rows, err = p.db.Query(q.sql, q.args...)
		if err == nil && rows != nil {
			break
		}
	}

	members := make([]ProjectMemberItem, 0)
	if err == nil && rows != nil {
		for _, r := range rows.Rows {
			sc := newRowScanner(rows.Columns, r)
			members = append(members, ProjectMemberItem{
				ID:        sc.str("id"),
				ProjectID: sc.str("project_id"),
				UserID:    sc.str("user_id"),
				Name:      sc.str("name"),
				Username:  sc.str("username"),
			})
		}
	}

	ok(res, members)
}

// updateTaskAssignees updates a task's assignees in PACA core database.
func (p *omniboardPlugin) updateTaskAssignees(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")

	var input struct {
		MemberIDs   []string `json:"member_ids"`
		AssigneeIDs []string `json:"assignee_ids"`
	}
	if err := json.Unmarshal(req.Body, &input); err != nil && len(req.Body) > 0 {
		res.JSON(400, map[string]any{"error": "invalid json payload"})
		return
	}

	wanted := input.MemberIDs
	if len(wanted) == 0 && len(input.AssigneeIDs) > 0 {
		wanted = input.AssigneeIDs
	}

	// 1. Delete current task_assignees
	_, err := p.db.Exec(`DELETE FROM task_assignees WHERE task_id = $1`, taskID)
	if err != nil {
		// Fallback for legacy tasks table with single assignee_id column
		var firstID any = nil
		if len(wanted) > 0 && wanted[0] != "" {
			firstID = wanted[0]
		}
		_, err2 := p.db.Exec(`UPDATE tasks SET assignee_id = $1, updated_at = $2 WHERE id = $3`, firstID, nowStr(), taskID)
		if err2 != nil {
			res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to update task assignees: %v", err)})
			return
		}
		ok(res, map[string]any{"success": true})
		return
	}

	// 2. Insert new task_assignees
	for _, mid := range wanted {
		if mid == "" {
			continue
		}
		_, _ = p.db.Exec(`INSERT INTO task_assignees (task_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, taskID, mid)
	}

	// 3. Update tasks.updated_at
	_, _ = p.db.Exec(`UPDATE tasks SET updated_at = $1 WHERE id = $2`, nowStr(), taskID)

	ok(res, map[string]any{"success": true})
}

// updateTaskStatus updates a task's status_id in PACA core database.
func (p *omniboardPlugin) updateTaskStatus(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")

	var input struct {
		StatusID *string `json:"status_id"`
	}
	if err := json.Unmarshal(req.Body, &input); err != nil && len(req.Body) > 0 {
		res.JSON(400, map[string]any{"error": "invalid json payload"})
		return
	}

	var statusParam any = nil
	if input.StatusID != nil && *input.StatusID != "" {
		statusParam = *input.StatusID
	}

	updateSQL := `UPDATE tasks SET status_id = $1, updated_at = $2 WHERE id = $3`
	_, err := p.db.Exec(updateSQL, statusParam, nowStr(), taskID)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to update task status: %v", err)})
		return
	}

	ok(res, map[string]any{"success": true})
}

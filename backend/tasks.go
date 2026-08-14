package main

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	plugin "github.com/Paca-AI/plugin-sdk-go"
)

// listProjects returns all active projects in PACA core.
func (p *omniboardPlugin) listProjects(req *plugin.Request, res *plugin.Response) {
	query := `SELECT id, name, COALESCE(description, '') AS description, task_id_prefix FROM projects ORDER BY name ASC`
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

	buildQuery := func(useImportance bool, qualifyID bool) (string, []any) {
		prioritySelect := "COALESCE(t.priority, 'medium') AS priority"
		if useImportance {
			prioritySelect = `CASE 
				WHEN t.importance >= 3 THEN 'urgent' 
				WHEN t.importance = 2 THEN 'high' 
				WHEN t.importance = 1 THEN 'medium' 
				ELSE 'low' 
			END AS priority`
		}

		whereID := "WHERE t.id IS NOT NULL"
		if !qualifyID {
			whereID = "WHERE id IS NOT NULL"
		}

		sqlParts := []string{
			fmt.Sprintf(`SELECT t.id, t.project_id, p.name AS project_name, p.task_id_prefix AS project_prefix, t.task_number, t.title, COALESCE(t.description, '') AS description, t.status_id, COALESCE(ts.name, '') AS status_name, COALESCE(ts.category, '') AS status_category, COALESCE(ts.color, '#64748b') AS status_color, t.assignee_id, COALESCE(u_pm.full_name, u_pm.username, u.full_name, u.username, '') AS assignee_name, %s, t.created_at, t.updated_at FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN task_statuses ts ON t.status_id = ts.id LEFT JOIN project_members pm ON t.assignee_id = pm.id LEFT JOIN users u_pm ON pm.user_id = u_pm.id LEFT JOIN users u ON t.assignee_id = u.id %s`, prioritySelect, whereID),
		}

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
			sqlParts = append(sqlParts, fmt.Sprintf("AND (t.title ILIKE $%d OR t.description ILIKE $%d OR CONCAT(p.task_id_prefix, '-', t.task_number) ILIKE $%d)", argIdx, argIdx, argIdx))
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

		// Filter by assignee if provided in query params
		filterAssignee := req.QueryParam("assigneeId")
		if filterAssignee != "" {
			sqlParts = append(sqlParts, fmt.Sprintf("AND t.assignee_id = $%d", argIdx))
			args = append(args, filterAssignee)
			argIdx++
		}

		// Filter by priority if provided in query params
		filterPriority := req.QueryParam("priority")
		if filterPriority != "" {
			if useImportance {
				switch strings.ToLower(filterPriority) {
				case "urgent":
					sqlParts = append(sqlParts, "AND t.importance >= 3")
				case "high":
					sqlParts = append(sqlParts, "AND t.importance = 2")
				case "medium":
					sqlParts = append(sqlParts, "AND t.importance = 1")
				case "low":
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

	// Try sequence:
	// 1. PostgreSQL production (qualify t.id, t.importance)
	// 2. PostgreSQL production with priority column (qualify t.id, t.priority)
	// 3. Mock/SQLite test context (unqualified id, t.importance)
	// 4. Mock/SQLite test context (unqualified id, t.priority)
	var taskRows *plugin.DBQueryResult

	attempts := []struct {
		useImportance bool
		qualifyID     bool
	}{
		{useImportance: true, qualifyID: true},
		{useImportance: false, qualifyID: true},
		{useImportance: true, qualifyID: false},
		{useImportance: false, qualifyID: false},
	}

	for _, att := range attempts {
		q, args := buildQuery(att.useImportance, att.qualifyID)
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
				AssigneeID:     sc.strPtr("assignee_id"),
				AssigneeName:   sc.str("assignee_name"),
				Priority:       sc.str("priority"),
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
	_, err := p.db.Query(updateSQL, statusParam, nowStr(), taskID)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to update task status: %v", err)})
		return
	}

	res.JSON(200, map[string]any{"success": true})
}

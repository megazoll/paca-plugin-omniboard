package main

import (
	"encoding/json"
	"fmt"

	plugin "github.com/Paca-AI/plugin-sdk-go"
)

func defaultColumnConfigJSON() string {
	cols := []ColumnConfig{
		{ID: "col-backlog", Title: "Backlog", StatusCategories: []string{"backlog"}, Color: "#64748b"},
		{ID: "col-todo", Title: "To Do", StatusCategories: []string{"todo"}, Color: "#eab308"},
		{ID: "col-inprogress", Title: "In Progress", StatusCategories: []string{"inprogress"}, Color: "#3b82f6"},
		{ID: "col-done", Title: "Done", StatusCategories: []string{"done"}, Color: "#22c55e"},
	}
	b, _ := json.Marshal(cols)
	return string(b)
}

// listBoards returns all boards visible in the current scope.
func (p *omniboardPlugin) listBoards(req *plugin.Request, res *plugin.Response) {
	scope := req.QueryParam("scope")
	if scope == "" {
		if req.Caller.ProjectID != "" {
			scope = "project"
		} else {
			scope = "admin"
		}
	}

	query := `
		SELECT id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at
		FROM omniboards
		ORDER BY created_at ASC
	`
	rows, err := p.db.Query(query)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to query boards: %v", err)})
		return
	}

	boards := parseBoardRows(rows)

	// If no board exists in DB yet, create a default "Main Omniboard"
	if len(boards) == 0 {
		defaultBoard := createDefaultBoard(p.db, req.Caller.ProjectID, scope, nullableUUID(req.Caller.CallerID))
		if defaultBoard != nil {
			boards = append(boards, *defaultBoard)
		}
	}

	ok(res, boards)
}

// createBoard creates a new board.
func (p *omniboardPlugin) createBoard(req *plugin.Request, res *plugin.Response) {
	var input struct {
		Name         string         `json:"name"`
		Description  string         `json:"description"`
		ProjectIDs   []string       `json:"project_ids"`
		ColumnConfig []ColumnConfig `json:"column_config"`
		Filters      map[string]any `json:"filters"`
		Scope        string         `json:"scope"`
	}
	if err := json.Unmarshal(req.Body, &input); err != nil && len(req.Body) > 0 {
		res.JSON(400, map[string]any{"error": "invalid json payload"})
		return
	}

	if input.Name == "" {
		input.Name = "New Board"
	}

	scope := input.Scope
	if scope == "" {
		if req.Caller.ProjectID != "" {
			scope = "project"
		} else {
			scope = "admin"
		}
	}

	colConfigJSON := defaultColumnConfigJSON()
	if len(input.ColumnConfig) > 0 {
		if b, err := json.Marshal(input.ColumnConfig); err == nil {
			colConfigJSON = string(b)
		}
	}

	projectIDsJSON := "[]"
	if len(input.ProjectIDs) > 0 {
		if b, err := json.Marshal(input.ProjectIDs); err == nil {
			projectIDsJSON = string(b)
		}
	}

	filtersJSON := "{}"
	if len(input.Filters) > 0 {
		if b, err := json.Marshal(input.Filters); err == nil {
			filtersJSON = string(b)
		}
	}

	var projIDParam any = nil
	if req.Caller.ProjectID != "" {
		projIDParam = req.Caller.ProjectID
	}

	insertSQL := `
		INSERT INTO omniboards (project_id, scope, name, description, project_ids, column_config, filters, created_by, updated_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
		RETURNING id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at
	`

	now := nowStr()
	rows, err := p.db.Query(insertSQL, projIDParam, scope, input.Name, input.Description, projectIDsJSON, colConfigJSON, filtersJSON, nullableUUID(req.Caller.CallerID), now)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to create board: %v", err)})
		return
	}

	boards := parseBoardRows(rows)
	if len(boards) > 0 {
		created(res, boards[0])
	} else {
		res.JSON(500, map[string]any{"error": "failed to return created board"})
	}
}

// getBoard returns a single board by ID.
func (p *omniboardPlugin) getBoard(req *plugin.Request, res *plugin.Response) {
	boardID := req.PathParam("boardId")
	query := `
		SELECT id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at
		FROM omniboards
		WHERE id = $1
	`
	rows, err := p.db.Query(query, boardID)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to get board: %v", err)})
		return
	}

	boards := parseBoardRows(rows)
	if len(boards) == 0 {
		res.JSON(404, map[string]any{"error": "board not found"})
		return
	}

	ok(res, boards[0])
}

// updateBoard updates board details & configuration.
func (p *omniboardPlugin) updateBoard(req *plugin.Request, res *plugin.Response) {
	boardID := req.PathParam("boardId")

	var input struct {
		Name         *string         `json:"name"`
		Description  *string         `json:"description"`
		ProjectIDs   *[]string       `json:"project_ids"`
		ColumnConfig *[]ColumnConfig `json:"column_config"`
		Filters      *map[string]any `json:"filters"`
	}
	if err := json.Unmarshal(req.Body, &input); err != nil {
		res.JSON(400, map[string]any{"error": "invalid json payload"})
		return
	}

	// Fetch current board
	rows, err := p.db.Query(`SELECT id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at FROM omniboards WHERE id = $1`, boardID)
	if err != nil || len(rows.Rows) == 0 {
		res.JSON(404, map[string]any{"error": "board not found"})
		return
	}
	current := parseBoardRows(rows)[0]

	name := current.Name
	if input.Name != nil {
		name = *input.Name
	}
	description := current.Description
	if input.Description != nil {
		description = *input.Description
	}

	projectIDsJSON := "[]"
	if input.ProjectIDs != nil {
		if b, err := json.Marshal(*input.ProjectIDs); err == nil {
			projectIDsJSON = string(b)
		}
	} else if b, err := json.Marshal(current.ProjectIDs); err == nil {
		projectIDsJSON = string(b)
	}

	colConfigJSON := defaultColumnConfigJSON()
	if input.ColumnConfig != nil {
		if b, err := json.Marshal(*input.ColumnConfig); err == nil {
			colConfigJSON = string(b)
		}
	} else if b, err := json.Marshal(current.ColumnConfig); err == nil {
		colConfigJSON = string(b)
	}

	filtersJSON := "{}"
	if input.Filters != nil {
		if b, err := json.Marshal(*input.Filters); err == nil {
			filtersJSON = string(b)
		}
	} else if b, err := json.Marshal(current.Filters); err == nil {
		filtersJSON = string(b)
	}

	updateSQL := `
		UPDATE omniboards
		SET name = $1, description = $2, project_ids = $3::jsonb, column_config = $4::jsonb, filters = $5::jsonb, updated_at = $6
		WHERE id = $7
		RETURNING id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at
	`
	now := nowStr()
	updatedRows, err := p.db.Query(updateSQL, name, description, projectIDsJSON, colConfigJSON, filtersJSON, now, boardID)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to update board: %v", err)})
		return
	}

	boards := parseBoardRows(updatedRows)
	if len(boards) > 0 {
		ok(res, boards[0])
	} else {
		res.JSON(500, map[string]any{"error": "failed to update board"})
	}
}

// deleteBoard removes a board.
func (p *omniboardPlugin) deleteBoard(req *plugin.Request, res *plugin.Response) {
	boardID := req.PathParam("boardId")
	_, err := p.db.Query(`DELETE FROM omniboards WHERE id = $1`, boardID)
	if err != nil {
		res.JSON(500, map[string]any{"error": fmt.Sprintf("failed to delete board: %v", err)})
		return
	}
	res.JSON(200, map[string]any{"success": true})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func createDefaultBoard(db *plugin.DB, projIDStr string, scope string, callerID any) *Omniboard {
	var projIDParam any = nil
	if projIDStr != "" {
		projIDParam = projIDStr
	}
	colConfigJSON := defaultColumnConfigJSON()
	insertSQL := `
		INSERT INTO omniboards (project_id, scope, name, description, project_ids, column_config, filters, created_by, updated_at)
		VALUES ($1, $2, 'Main Omniboard', 'Multi-project Kanban board', '[]'::jsonb, $3::jsonb, '{}'::jsonb, $4, $5)
		RETURNING id, project_id, scope, name, description, project_ids, column_config, filters, created_at, updated_at
	`
	rows, err := db.Query(insertSQL, projIDParam, scope, colConfigJSON, callerID, nowStr())
	if err != nil {
		return nil
	}
	boards := parseBoardRows(rows)
	if len(boards) > 0 {
		return &boards[0]
	}
	return nil
}

func parseBoardRows(res *plugin.DBQueryResult) []Omniboard {
	if res == nil || len(res.Rows) == 0 {
		return []Omniboard{}
	}

	out := make([]Omniboard, 0, len(res.Rows))
	for _, r := range res.Rows {
		sc := newRowScanner(res.Columns, r)
		b := Omniboard{
			ID:          sc.str("id"),
			ProjectID:   sc.strPtr("project_id"),
			Scope:       sc.str("scope"),
			Name:        sc.str("name"),
			Description: sc.str("description"),
		}

		// Unmarshal ProjectIDs
		projIDsVal := sc.str("project_ids")
		if projIDsVal != "" {
			_ = json.Unmarshal([]byte(projIDsVal), &b.ProjectIDs)
		}
		if b.ProjectIDs == nil {
			b.ProjectIDs = []string{}
		}

		// Unmarshal ColumnConfig
		colConfigVal := sc.str("column_config")
		if colConfigVal != "" {
			_ = json.Unmarshal([]byte(colConfigVal), &b.ColumnConfig)
		}
		if b.ColumnConfig == nil {
			b.ColumnConfig = []ColumnConfig{}
		}

		// Unmarshal Filters
		filtersVal := sc.str("filters")
		if filtersVal != "" {
			_ = json.Unmarshal([]byte(filtersVal), &b.Filters)
		}
		if b.Filters == nil {
			b.Filters = map[string]any{}
		}

		b.CreatedAt = sc.str("created_at")
		b.UpdatedAt = sc.str("updated_at")

		out = append(out, b)
	}

	return out
}

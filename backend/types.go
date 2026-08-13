package main

import "fmt"

// ── Domain types ──────────────────────────────────────────────────────────────

// Omniboard represents a multi-project Kanban board configuration.
type Omniboard struct {
	ID          string           `json:"id"`
	ProjectID   *string          `json:"project_id,omitempty"`
	Scope       string           `json:"scope"` // "project" | "admin" | "integration"
	Name        string           `json:"name"`
	Description string           `json:"description"`
	ProjectIDs  []string         `json:"project_ids"`   // list of project UUIDs, empty = all
	ColumnConfig []ColumnConfig `json:"column_config"` // list of columns & status mappings
	Filters     map[string]any   `json:"filters"`       // saved filters
	CreatedAt   string           `json:"created_at"`
	UpdatedAt   string           `json:"updated_at"`
}

// ColumnConfig represents a single column on the Kanban board.
type ColumnConfig struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	StatusCategories []string `json:"status_categories,omitempty"` // e.g. ["todo"], ["inprogress"]
	StatusNames      []string `json:"status_names,omitempty"`      // e.g. ["In Review"]
	Color            string   `json:"color,omitempty"`
}

// CrossProjectTask represents a task with attached project & status metadata.
type CrossProjectTask struct {
	ID             string  `json:"id"`
	ProjectID      string  `json:"project_id"`
	ProjectName    string  `json:"project_name"`
	ProjectPrefix  string  `json:"project_prefix"`
	TaskNumber     int     `json:"task_number"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	StatusID       *string `json:"status_id"`
	StatusName     string  `json:"status_name"`
	StatusCategory string  `json:"status_category"`
	StatusColor    string  `json:"status_color"`
	AssigneeID     *string `json:"assignee_id"`
	AssigneeName   string  `json:"assignee_name"`
	Priority       string  `json:"priority"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

// ProjectItem summary for UI dropdowns.
type ProjectItem struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	TaskIDPrefix string `json:"task_id_prefix"`
}

// StatusItem summary for UI status configuration.
type StatusItem struct {
	ID        string `json:"id"`
	ProjectID string `json:"project_id"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	Category  string `json:"category"`
	Position  int    `json:"position"`
	IsDefault bool   `json:"is_default"`
}

// ── Row scanner helper ────────────────────────────────────────────────────────

type scanner struct {
	idx map[string]int
	row []any
}

func newRowScanner(cols []string, row []any) *scanner {
	idx := make(map[string]int, len(cols))
	for i, c := range cols {
		idx[c] = i
	}
	return &scanner{idx: idx, row: row}
}

func (s *scanner) str(col string) string {
	i, ok := s.idx[col]
	if !ok || i >= len(s.row) || s.row[i] == nil {
		return ""
	}
	switch v := s.row[i].(type) {
	case string:
		return v
	case *string:
		if v == nil {
			return ""
		}
		return *v
	default:
		return fmt.Sprintf("%v", s.row[i])
	}
}

func (s *scanner) strPtr(col string) *string {
	i, ok := s.idx[col]
	if !ok || i >= len(s.row) || s.row[i] == nil {
		return nil
	}
	v := s.str(col)
	return &v
}

func (s *scanner) intVal(col string) int {
	i, ok := s.idx[col]
	if !ok || i >= len(s.row) || s.row[i] == nil {
		return 0
	}
	switch v := s.row[i].(type) {
	case float64:
		return int(v)
	case int:
		return v
	case int64:
		return int(v)
	default:
		return 0
	}
}

func (s *scanner) boolVal(col string) bool {
	i, ok := s.idx[col]
	if !ok || i >= len(s.row) || s.row[i] == nil {
		return false
	}
	switch v := s.row[i].(type) {
	case bool:
		return v
	case *bool:
		if v == nil {
			return false
		}
		return *v
	default:
		return false
	}
}

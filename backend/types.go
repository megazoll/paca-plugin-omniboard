package main

import (
	"encoding/json"
	"fmt"
)

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

// TaskAssignee represents an assigned user on a task.
type TaskAssignee struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ProjectMemberItem represents a project member with user information.
type ProjectMemberItem struct {
	ID        string `json:"id"`
	ProjectID string `json:"project_id"`
	UserID    string `json:"user_id"`
	Name      string `json:"name"`
	Username  string `json:"username"`
}

// CrossProjectTask represents a task with attached project & status metadata.
type CrossProjectTask struct {
	ID             string         `json:"id"`
	ProjectID      string         `json:"project_id"`
	ProjectName    string         `json:"project_name"`
	ProjectPrefix  string         `json:"project_prefix"`
	TaskNumber     int            `json:"task_number"`
	TaskTypeID     *string        `json:"task_type_id"`
	TaskTypeName   string         `json:"task_type_name"`
	TaskTypeIcon   string         `json:"task_type_icon"`
	TaskTypeColor  string         `json:"task_type_color"`
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	StatusID       *string        `json:"status_id"`
	StatusName     string         `json:"status_name"`
	StatusCategory string         `json:"status_category"`
	StatusColor    string         `json:"status_color"`
	AssigneeID     *string        `json:"assignee_id"`
	AssigneeName   string         `json:"assignee_name"`
	Assignees      []TaskAssignee `json:"assignees"`
	Priority       string         `json:"priority"`
	ParentTaskID   *string        `json:"parent_task_id"`
	CreatedAt      string         `json:"created_at"`
	UpdatedAt      string         `json:"updated_at"`
}

// TaskTypeItem summary for UI task type configuration.
type TaskTypeItem struct {
	ID          string `json:"id"`
	ProjectID   string `json:"project_id"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
	Description string `json:"description"`
	IsDefault   bool   `json:"is_default"`
	IsSystem    bool   `json:"is_system"`
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
	case []byte:
		return string(v)
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

func (s *scanner) jsonVal(col string, dest any) error {
	i, ok := s.idx[col]
	if !ok || i >= len(s.row) || s.row[i] == nil {
		return nil
	}
	switch v := s.row[i].(type) {
	case string:
		if v == "" {
			return nil
		}
		return json.Unmarshal([]byte(v), dest)
	case *string:
		if v == nil || *v == "" {
			return nil
		}
		return json.Unmarshal([]byte(*v), dest)
	case []byte:
		if len(v) == 0 {
			return nil
		}
		return json.Unmarshal(v, dest)
	default:
		data, err := json.Marshal(v)
		if err != nil {
			return err
		}
		return json.Unmarshal(data, dest)
	}
}


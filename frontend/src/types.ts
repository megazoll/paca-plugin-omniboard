export type OmniboardScope = "project" | "admin" | "integration";

export interface ColumnConfig {
  id: string;
  title: string;
  status_categories?: string[];
  status_names?: string[];
  color?: string;
}

export interface BoardFilters {
  search?: string;
  projectId?: string;
  assigneeId?: string;
  priority?: string;
  hide_subtasks?: boolean;
  done_retention_days?: number;
  dim_done_days?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  username: string;
}

export interface Omniboard {
  id: string;
  project_id?: string;
  scope: OmniboardScope;
  name: string;
  description: string;
  project_ids: string[];
  column_config: ColumnConfig[];
  filters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateOmniboardInput {
  name: string;
  description?: string;
  project_ids?: string[];
  column_config?: ColumnConfig[];
  filters?: Record<string, any>;
  scope?: OmniboardScope;
}

export interface UpdateOmniboardInput {
  name?: string;
  description?: string;
  project_ids?: string[];
  column_config?: ColumnConfig[];
  filters?: Record<string, any>;
}

export interface TaskAssignee {
  id: string;
  name: string;
}

export interface CrossProjectTask {
  id: string;
  project_id: string;
  project_name: string;
  project_prefix: string;
  task_number: number;
  title: string;
  description: string;
  status_id: string | null;
  status_name: string;
  status_category: string;
  status_color: string;
  assignee_id: string | null;
  assignee_name: string;
  assignees?: TaskAssignee[];
  priority: string;
  parent_task_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  task_id_prefix: string;
}

export interface StatusInfo {
  id: string;
  project_id: string;
  name: string;
  color: string;
  category: string;
  position: number;
  is_default: boolean;
}

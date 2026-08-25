import type { PluginApiClient } from "@paca-ai/plugin-sdk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PLUGIN_ID } from "./constants";
import type {
  BoardFilters,
  CreateOmniboardInput,
  CrossProjectTask,
  Omniboard,
  OmniboardScope,
  ProjectInfo,
  ProjectMember,
  StatusInfo,
  TaskTypeInfo,
  UpdateOmniboardInput,
} from "./types";

function getBasePath(api: PluginApiClient, scope: OmniboardScope): string {
  if (scope === "admin" || !api.projectId) {
    return "/omniboard/admin-boards";
  }
  return `/projects/${api.projectId}/omniboard/boards`;
}

function getProjectsPath(api: PluginApiClient, scope: OmniboardScope): string {
  if (scope === "admin" || !api.projectId) {
    return "/omniboard/admin-projects";
  }
  return `/projects/${api.projectId}/omniboard/projects`;
}

function getStatusesPath(api: PluginApiClient, scope: OmniboardScope): string {
  if (scope === "admin" || !api.projectId) {
    return "/omniboard/admin-statuses";
  }
  return `/projects/${api.projectId}/omniboard/statuses`;
}

function getTaskTypesPath(api: PluginApiClient, scope: OmniboardScope, projectId?: string): string {
  if (scope === "admin" || !api.projectId) {
    return projectId ? `/omniboard/admin-task-types?projectId=${projectId}` : "/omniboard/admin-task-types";
  }
  return projectId ? `/projects/${api.projectId}/omniboard/task-types?projectId=${projectId}` : `/projects/${api.projectId}/omniboard/task-types`;
}

function getMembersPath(api: PluginApiClient, scope: OmniboardScope, projectId?: string): string {
  if (scope === "admin" || !api.projectId) {
    return projectId ? `/omniboard/admin-members?projectId=${projectId}` : "/omniboard/admin-members";
  }
  return `/projects/${api.projectId}/omniboard/members`;
}

function getTaskStatusPath(api: PluginApiClient, scope: OmniboardScope, taskId: string): string {
  if (scope === "admin" || !api.projectId) {
    return `/omniboard/admin-tasks/${taskId}/status`;
  }
  return `/projects/${api.projectId}/omniboard/tasks/${taskId}/status`;
}

function getTaskTypePath(api: PluginApiClient, scope: OmniboardScope, taskId: string): string {
  if (scope === "admin" || !api.projectId) {
    return `/omniboard/admin-tasks/${taskId}/type`;
  }
  return `/projects/${api.projectId}/omniboard/tasks/${taskId}/type`;
}

function getTaskDescriptionPath(api: PluginApiClient, scope: OmniboardScope, taskId: string): string {
  if (scope === "admin" || !api.projectId) {
    return `/omniboard/admin-tasks/${taskId}/description`;
  }
  return `/projects/${api.projectId}/omniboard/tasks/${taskId}/description`;
}

function getTaskAssigneesPath(api: PluginApiClient, scope: OmniboardScope, taskId: string): string {
  if (scope === "admin" || !api.projectId) {
    return `/omniboard/admin-tasks/${taskId}/assignees`;
  }
  return `/projects/${api.projectId}/omniboard/tasks/${taskId}/assignees`;
}

async function unwrapData<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  if (res && typeof res === "object") {
    if ("error" in res && res.error && !("data" in res)) {
      throw new Error(typeof res.error === "string" ? res.error : JSON.stringify(res.error));
    }
    if ("data" in res && res.data !== undefined) {
      return res.data as T;
    }
  }
  return res as T;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useOmniboards(api: PluginApiClient, scope: OmniboardScope = "project") {
  const basePath = getBasePath(api, scope);
  const path = `${basePath}?scope=${scope}`;
  return useQuery<Omniboard[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "boards", scope, api.projectId],
    queryFn: () => unwrapData<Omniboard[]>(api.pluginGet(PLUGIN_ID, path)),
    staleTime: 10 * 1000,
  });
}

export function useOmniboard(api: PluginApiClient, boardId: string, scope: OmniboardScope = "project") {
  const basePath = getBasePath(api, scope);
  return useQuery<Omniboard, Error>({
    queryKey: ["plugin", PLUGIN_ID, "board", scope, boardId],
    queryFn: () => unwrapData<Omniboard>(api.pluginGet(PLUGIN_ID, `${basePath}/${boardId}`)),
    enabled: !!boardId,
    staleTime: 10 * 1000,
  });
}

export function useOmniboardProjects(api: PluginApiClient, scope: OmniboardScope = "project") {
  const path = getProjectsPath(api, scope);
  return useQuery<ProjectInfo[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "projects", scope],
    queryFn: () => unwrapData<ProjectInfo[]>(api.pluginGet(PLUGIN_ID, path)),
    staleTime: 60 * 1000,
  });
}

export function useOmniboardStatuses(api: PluginApiClient, scope: OmniboardScope = "project") {
  const path = getStatusesPath(api, scope);
  return useQuery<StatusInfo[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "statuses", scope],
    queryFn: () => unwrapData<StatusInfo[]>(api.pluginGet(PLUGIN_ID, path)),
    staleTime: 60 * 1000,
  });
}

export function useOmniboardTaskTypes(api: PluginApiClient, scope: OmniboardScope = "project", projectId?: string) {
  const path = getTaskTypesPath(api, scope, projectId);
  return useQuery<TaskTypeInfo[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "task-types", scope, projectId || "all"],
    queryFn: () => unwrapData<TaskTypeInfo[]>(api.pluginGet(PLUGIN_ID, path)),
    staleTime: 60 * 1000,
  });
}

export function useOmniboardMembers(api: PluginApiClient, scope: OmniboardScope = "project", projectId?: string) {
  const path = getMembersPath(api, scope, projectId);
  return useQuery<ProjectMember[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "members", scope, projectId || "all"],
    queryFn: () => unwrapData<ProjectMember[]>(api.pluginGet(PLUGIN_ID, path)),
    staleTime: 60 * 1000,
  });
}

export function useOmniboardTasks(
  api: PluginApiClient,
  boardId: string,
  filters: BoardFilters = {},
  scope: OmniboardScope = "project"
) {
  const basePath = getBasePath(api, scope);
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.set("search", filters.search);
  if (filters.projectId) queryParams.set("projectId", filters.projectId);
  if (filters.assigneeId) queryParams.set("assigneeId", filters.assigneeId);
  if (filters.priority) queryParams.set("priority", filters.priority);

  const queryString = queryParams.toString();
  const path = `${basePath}/${boardId}/tasks${queryString ? `?${queryString}` : ""}`;

  return useQuery<CrossProjectTask[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "tasks", scope, boardId, filters],
    queryFn: () => unwrapData<CrossProjectTask[]>(api.pluginGet(PLUGIN_ID, path)),
    enabled: !!boardId,
    refetchInterval: 15 * 1000, // auto-refresh board tasks every 15s
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function useInvalidateOmniboards(api: PluginApiClient) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID] });
}

export function useCreateOmniboard(api: PluginApiClient, scope: OmniboardScope = "project") {
  const invalidate = useInvalidateOmniboards(api);
  const path = getBasePath(api, scope);
  return useMutation({
    mutationFn: (input: CreateOmniboardInput) => unwrapData<Omniboard>(api.pluginPost(PLUGIN_ID, path, input)),
    onSuccess: invalidate,
  });
}

export function useUpdateOmniboard(api: PluginApiClient, scope: OmniboardScope = "project") {
  const invalidate = useInvalidateOmniboards(api);
  const basePath = getBasePath(api, scope);
  return useMutation({
    mutationFn: ({ boardId, input }: { boardId: string; input: UpdateOmniboardInput }) =>
      unwrapData<Omniboard>(api.pluginPatch(PLUGIN_ID, `${basePath}/${boardId}`, input)),
    onSuccess: invalidate,
  });
}

export function useDeleteOmniboard(api: PluginApiClient, scope: OmniboardScope = "project") {
  const invalidate = useInvalidateOmniboards(api);
  const basePath = getBasePath(api, scope);
  return useMutation({
    mutationFn: (boardId: string) => unwrapData<any>(api.pluginDelete(PLUGIN_ID, `${basePath}/${boardId}`)),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskStatus(api: PluginApiClient, scope: OmniboardScope = "project") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      unwrapData<any>(api.pluginPatch(PLUGIN_ID, getTaskStatusPath(api, scope, taskId), { status_id: statusId })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID, "tasks"] });
    },
  });
}

export function useUpdateTaskType(api: PluginApiClient, scope: OmniboardScope = "project") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, taskTypeId }: { taskId: string; taskTypeId: string | null }) =>
      unwrapData<any>(api.pluginPatch(PLUGIN_ID, getTaskTypePath(api, scope, taskId), { task_type_id: taskTypeId })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID, "tasks"] });
    },
  });
}

export function useUpdateTaskDescription(api: PluginApiClient, scope: OmniboardScope = "project") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, description }: { taskId: string; description: string }) =>
      unwrapData<any>(api.pluginPatch(PLUGIN_ID, getTaskDescriptionPath(api, scope, taskId), { description })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID, "tasks"] });
    },
  });
}

export function useUpdateTaskAssignees(api: PluginApiClient, scope: OmniboardScope = "project") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, memberIds }: { taskId: string; memberIds: string[] }) =>
      unwrapData<any>(api.pluginPatch(PLUGIN_ID, getTaskAssigneesPath(api, scope, taskId), { member_ids: memberIds })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID, "tasks"] });
    },
  });
}

export function useCreateOmniboardTask(api: PluginApiClient, scope: OmniboardScope = "project") {
  const qc = useQueryClient();
  const path =
    scope === "admin" || !api.projectId
      ? "/omniboard/admin-tasks"
      : `/projects/${api.projectId}/omniboard/tasks`;
  return useMutation({
    mutationFn: (input: {
      project_id: string;
      title: string;
      status_id?: string | null;
      task_type_id?: string | null;
      description?: string;
    }) => unwrapData<any>(api.pluginPost(PLUGIN_ID, path, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID, "tasks"] });
    },
  });
}


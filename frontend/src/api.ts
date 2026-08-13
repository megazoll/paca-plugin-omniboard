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
  StatusInfo,
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

function getTaskStatusPath(api: PluginApiClient, scope: OmniboardScope, taskId: string): string {
  if (scope === "admin" || !api.projectId) {
    return `/omniboard/admin-tasks/${taskId}/status`;
  }
  return `/projects/${api.projectId}/omniboard/tasks/${taskId}/status`;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useOmniboards(api: PluginApiClient, scope: OmniboardScope = "project") {
  const path = getBasePath(api, scope);
  return useQuery<Omniboard[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "boards", scope, api.projectId],
    queryFn: () => api.pluginGet<Omniboard[]>(PLUGIN_ID, path),
    staleTime: 10 * 1000,
  });
}

export function useOmniboard(api: PluginApiClient, boardId: string, scope: OmniboardScope = "project") {
  const basePath = getBasePath(api, scope);
  return useQuery<Omniboard, Error>({
    queryKey: ["plugin", PLUGIN_ID, "board", scope, boardId],
    queryFn: () => api.pluginGet<Omniboard>(PLUGIN_ID, `${basePath}/${boardId}`),
    enabled: !!boardId,
    staleTime: 10 * 1000,
  });
}

export function useOmniboardProjects(api: PluginApiClient, scope: OmniboardScope = "project") {
  const path = getProjectsPath(api, scope);
  return useQuery<ProjectInfo[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "projects", scope],
    queryFn: () => api.pluginGet<ProjectInfo[]>(PLUGIN_ID, path),
    staleTime: 60 * 1000,
  });
}

export function useOmniboardStatuses(api: PluginApiClient, scope: OmniboardScope = "project") {
  const path = getStatusesPath(api, scope);
  return useQuery<StatusInfo[], Error>({
    queryKey: ["plugin", PLUGIN_ID, "statuses", scope],
    queryFn: () => api.pluginGet<StatusInfo[]>(PLUGIN_ID, path),
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
    queryFn: () => api.pluginGet<CrossProjectTask[]>(PLUGIN_ID, path),
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
    mutationFn: (input: CreateOmniboardInput) => api.pluginPost<Omniboard>(PLUGIN_ID, path, input),
    onSuccess: invalidate,
  });
}

export function useUpdateOmniboard(api: PluginApiClient, scope: OmniboardScope = "project") {
  const invalidate = useInvalidateOmniboards(api);
  const basePath = getBasePath(api, scope);
  return useMutation({
    mutationFn: ({ boardId, input }: { boardId: string; input: UpdateOmniboardInput }) =>
      api.pluginPatch<Omniboard>(PLUGIN_ID, `${basePath}/${boardId}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteOmniboard(api: PluginApiClient, scope: OmniboardScope = "project") {
  const invalidate = useInvalidateOmniboards(api);
  const basePath = getBasePath(api, scope);
  return useMutation({
    mutationFn: (boardId: string) => api.pluginDelete(PLUGIN_ID, `${basePath}/${boardId}`),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskStatus(api: PluginApiClient, scope: OmniboardScope = "project") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      api.pluginPatch(PLUGIN_ID, getTaskStatusPath(api, scope, taskId), { status_id: statusId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugin", PLUGIN_ID, "tasks"] });
    },
  });
}

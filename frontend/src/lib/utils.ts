// Ported verbatim from apps/web/src/lib/utils.ts (cn() only — cleanBlocks
// is unused here and stays host-only).
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ColumnConfig, StatusInfo } from "../types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Finds the most suitable status in a project for a specific Kanban column.
 */
export function resolveStatusForColumn(
	projectStatuses: StatusInfo[],
	column: ColumnConfig,
): string | null {
	if (!projectStatuses || projectStatuses.length === 0) return null;

	const normalize = (str?: string) =>
		(str || "").toLowerCase().replace(/[\s_-]/g, "");
	const colTitle = normalize(column.title);

	// 1. Check column.status_categories
	if (column.status_categories && column.status_categories.length > 0) {
		const matched = projectStatuses.find((s) => {
			const sCat = normalize(s.category);
			return column.status_categories?.some((c) => {
				const normC = normalize(c);
				if (!normC || !sCat) return normC === sCat;
				return normC === sCat || normC.includes(sCat) || sCat.includes(normC);
			});
		});
		if (matched) return matched.id;
	}

	// 2. Check column.status_names
	if (column.status_names && column.status_names.length > 0) {
		const matched = projectStatuses.find((s) =>
			column.status_names?.some((n) => normalize(n) === normalize(s.name)),
		);
		if (matched) return matched.id;
	}

	// 3. Check column.title
	if (colTitle) {
		const matched = projectStatuses.find(
			(s) =>
				normalize(s.name) === colTitle || normalize(s.category) === colTitle,
		);
		if (matched) return matched.id;
	}

	// 4. Fallback: project's default status or first status
	const defaultStatus =
		projectStatuses.find((s) => s.is_default) || projectStatuses[0];
	return defaultStatus ? defaultStatus.id : null;
}


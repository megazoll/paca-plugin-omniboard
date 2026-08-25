import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import React, { useCallback, useEffect, useRef } from "react";

interface TaskDescriptionEditorProps {
  description?: string | unknown[] | null;
  canEdit?: boolean;
  onUpdate?: (description: string) => void;
}

export function normalizeBlocks(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback to text block
      }
    }
    // Multiline plain text to paragraph blocks
    const lines = raw.split("\n");
    return lines.map((line) => {
      if (!line) return { type: "paragraph" };
      return {
        type: "paragraph",
        content: [{ type: "text", text: line, styles: {} }],
      };
    });
  }
  return [];
}

export function cleanBlocksData(blocks: unknown): any[] | null {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  if (
    blocks.length === 1 &&
    blocks[0].type === "paragraph" &&
    (!blocks[0].content || blocks[0].content.length === 0)
  ) {
    return null;
  }
  return blocks as any[];
}

export const TaskDescriptionEditor: React.FC<TaskDescriptionEditorProps> = ({
  description,
  canEdit = true,
  onUpdate,
}) => {
  const lastSavedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const pendingRef = useRef(false);
  const readyRef = useRef(false);

  const editor = useCreateBlockNote();

  // Populate editor on initial load or external update
  useEffect(() => {
    const displayBlocks = normalizeBlocks(description ?? null);
    const cleaned = cleanBlocksData(displayBlocks);
    const normalizedStr = cleaned ? JSON.stringify(cleaned) : "";

    if (initializedRef.current && normalizedStr === lastSavedRef.current) {
      return;
    }
    initializedRef.current = true;
    lastSavedRef.current = normalizedStr;
    readyRef.current = false;

    if (displayBlocks.length > 0) {
      editor.replaceBlocks(editor.document, displayBlocks as any);
    } else {
      editor.replaceBlocks(editor.document, [{ type: "paragraph" }] as any);
    }

    queueMicrotask(() => {
      readyRef.current = true;
    });
  }, [description, editor]);

  const handleChange = useCallback(() => {
    if (!canEdit || !readyRef.current) return;
    pendingRef.current = true;
  }, [canEdit]);

  const save = useCallback(() => {
    if (!canEdit || !pendingRef.current) return;
    pendingRef.current = false;
    const blocks = editor.document;
    const cleaned = cleanBlocksData(blocks);
    const valueStr = cleaned ? JSON.stringify(cleaned) : "";
    if (valueStr !== lastSavedRef.current) {
      lastSavedRef.current = valueStr;
      onUpdate?.(valueStr);
    }
  }, [canEdit, editor, onUpdate]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      save();
    },
    [save]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    },
    [save]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 flex items-center gap-2 w-full">
          <span>Description</span>
          <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent" />
        </h3>
      </div>

      <div
        className="rounded-xl border border-border/25 bg-card/50 hover:border-border/50 transition-all duration-200 overflow-hidden [&_.bn-editor]:min-h-20 [&_.bn-editor]:py-3 [&_.bn-editor]:text-sm [&_.bn-editor]:leading-relaxed"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        <BlockNoteView
          editor={editor}
          editable={canEdit}
          onChange={handleChange}
          className="bn-shadcn"
          sideMenu={false}
        />
      </div>
    </div>
  );
};

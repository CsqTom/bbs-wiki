"use client";

import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownPreview from "@uiw/react-markdown-preview";
import remarkGfm from "remark-gfm";

const MindMapViewer = lazy(() =>
  import("@/components/wiki/MindMapViewer").then((m) => ({
    default: m.MindMapViewer,
  })),
);

type RightPanelMode = "preview" | "mindmap";

interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  directoryId: string | null;
  updatedAt: string;
}

export function WikiArticleEditor({
  article,
}: {
  article: Article;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(article.content);
  const [savedContent, setSavedContent] = useState(article.content);
  const [saving, setSaving] = useState(false);
  const [rightPanelMode, setRightPanelMode] =
    useState<RightPanelMode>("preview");
  const [editorWidth, setEditorWidth] = useState(52);
  const [isDragging, setIsDragging] = useState(false);

  const hasUnsavedChanges = content !== savedContent;

  useEffect(() => {
    if (!isDragging) return;

    // 拖拽时持续根据鼠标位置计算左右面板占比，并限制最小宽度。
    function handleMouseMove(event: MouseEvent) {
      if (!containerRef.current) return;

      const bounds = containerRef.current.getBoundingClientRect();
      const nextWidth =
        ((event.clientX - bounds.left) / bounds.width) * 100;
      const clampedWidth = Math.min(72, Math.max(28, nextWidth));
      setEditorWidth(clampedWidth);
    }

    function stopDragging() {
      setIsDragging(false);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [isDragging]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/wiki/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSavedContent(content);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleShareToBoard() {
    const boardId = prompt("Enter Board ID to share to:");
    if (!boardId) return;

    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        title: article.title,
        content,
        sourceType: "ARTICLE",
        sourceId: article.id,
      }),
    });
    alert("Shared successfully!");
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{article.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            左侧编辑 Markdown，右侧实时查看增强预览或思维导图。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRightPanelMode("preview")}
            className={`px-3 py-1.5 rounded text-sm transition ${
              rightPanelMode === "preview"
                ? "bg-blue-700 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setRightPanelMode("mindmap")}
            className={`px-3 py-1.5 rounded text-sm transition ${
              rightPanelMode === "mindmap"
                ? "bg-blue-700 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Mind Map
          </button>
          <button
            onClick={handleShareToBoard}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
          >
            Share to Board
          </button>
          <button
            onClick={() => setContent(savedContent)}
            disabled={!hasUnsavedChanges || saving}
            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
        <span>
          {hasUnsavedChanges
            ? "当前有未保存修改，右侧面板会实时同步编辑内容。"
            : "当前内容已保存，右侧面板展示最新版本。"}
        </span>
        <span className="text-xs text-blue-700">
          Editor {Math.round(editorWidth)}% / Panel {Math.round(100 - editorWidth)}%
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        <section
          className="flex min-w-0 shrink-0 flex-col"
          style={{ width: `${editorWidth}%` }}
        >
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Markdown Editor
              </h2>
              <p className="text-xs text-gray-500">支持实时联动预览和思维导图</p>
            </div>
            <span className="text-xs text-gray-500">
              {content.length} chars
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-0 flex-1 resize-none border-0 bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-slate-100 focus:outline-none"
          />
        </section>

        <button
          type="button"
          aria-label="Resize panels"
          onMouseDown={() => setIsDragging(true)}
          className="group flex w-3 shrink-0 cursor-col-resize items-center justify-center border-x border-gray-200 bg-gray-100 transition hover:bg-blue-50"
        >
          <span className="h-20 w-1 rounded-full bg-gray-300 transition group-hover:bg-blue-400" />
        </button>

        <section className="flex min-w-0 min-h-0 flex-1 flex-col bg-gray-50">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {rightPanelMode === "preview" ? "Enhanced Preview" : "Mind Map"}
              </h2>
              <p className="text-xs text-gray-500">
                {rightPanelMode === "preview"
                  ? "使用 GitHub 风格组件改善 Markdown 展示效果"
                  : "根据当前 Markdown 实时生成结构化导图"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRightPanelMode("preview")}
                className={`rounded px-3 py-1.5 text-xs transition ${
                  rightPanelMode === "preview"
                    ? "bg-blue-700 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode("mindmap")}
                className={`rounded px-3 py-1.5 text-xs transition ${
                  rightPanelMode === "mindmap"
                    ? "bg-blue-700 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                Mind Map
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            {rightPanelMode === "preview" ? (
              <div className="markdown-preview-panel min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-white p-6">
                <div className="wmde-markdown-var" />
                <MarkdownPreview
                  source={
                    content || "*No content yet. Start writing in the editor.*"
                  }
                  remarkPlugins={[remarkGfm]}
                  wrapperElement={{ "data-color-mode": "light" }}
                />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div
                    className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white"
                  >
                    <p className="text-gray-500">Loading mind map...</p>
                  </div>
                }
              >
                <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <MindMapViewer
                    content={content || "# No content yet"}
                    onSyncMarkdown={(markdown) => setContent(markdown)}
                  />
                </div>
              </Suspense>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

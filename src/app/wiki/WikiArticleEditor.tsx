"use client";

import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownPreview from "@uiw/react-markdown-preview";
import remarkGfm from "remark-gfm";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";
import { PublishToForumDialog } from "./PublishToForumDialog";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mindMapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [content, setContent] = useState(article.content);
  const [savedContent, setSavedContent] = useState(article.content);
  const [mindMapContent, setMindMapContent] = useState(article.content);
  const [saving, setSaving] = useState(false);
  const [rightPanelMode, setRightPanelMode] =
    useState<RightPanelMode>("preview");
  const [editorWidth, setEditorWidth] = useState(52);
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const confirm = useConfirm();
  const prompt = usePrompt();

  const hasUnsavedChanges = content !== savedContent;

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "系统可能不会保存您所做的更改。";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleAnchorClick = async (e: MouseEvent) => {
      const target = (e.target as Element).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || target.target === "_blank" || href.startsWith("#") || href.startsWith("javascript:")) return;

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);

        // 如果目标URL和当前URL(不含hash)不同，则说明要离开页面
        if (currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search) {
          e.preventDefault();
          e.stopPropagation();
          
          const isConfirmed = await confirm({
            title: "Wiki未保存更改",
            message: "当前页面有未保存的更改，离开后将丢失未保存的更改。确定要离开吗？",
            confirmText: "离开",
            cancelText: "取消",
            danger: true
          });
          
          if (isConfirmed) {
            router.push(href);
          }
        }
      } catch (err) {
        // 忽略无效URL导致的错误
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, [hasUnsavedChanges]);

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

  // 思维导图渲染开销大，用户输入时延迟更新，避免每输入一个字符都重建思维导图。
  useEffect(() => {
    if (mindMapTimerRef.current) {
      clearTimeout(mindMapTimerRef.current);
    }
    mindMapTimerRef.current = setTimeout(() => {
      setMindMapContent(content);
      mindMapTimerRef.current = null;
    }, 1000);
    return () => {
      if (mindMapTimerRef.current) {
        clearTimeout(mindMapTimerRef.current);
      }
    };
  }, [content]);

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

  function insertText(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent =
      content.substring(0, start) + text + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + text.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }

  async function handleUploadLocalImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "wiki");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        insertText(`![图片](${url})`);
      } else {
        alert("上传图片失败");
      }
    } catch {
      alert("上传图片失败");
    } finally {
      // Reset so the same file can be re-selected
      e.target.value = "";
    }
  }

  async function handleWebImage() {
    const url = await prompt({
      title: "插入网络图片",
      message: "请输入网络图片URL:",
      defaultValue: "https://"
    });
    if (url && url.trim()) {
      insertText(`![图片](${url.trim()})`);
    }
  }

  async function handleWebLink() {
    const url = await prompt({
      title: "插入网页链接",
      message: "请输入链接URL:",
      defaultValue: "https://"
    });
    if (!url || !url.trim()) return;
    
    const text = await prompt({
      title: "插入网页链接",
      message: "请输入链接显示文字:",
      defaultValue: "链接"
    });
    if (!text || !text.trim()) return;
    
    insertText(`[${text.trim()}](${url.trim()})`);
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
            onClick={() => setIsPublishDialogOpen(true)}
            className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-sm hover:bg-indigo-200 transition-colors border border-indigo-200 flex items-center gap-1"
          >
            发布到论坛
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
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
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Markdown Editor
                </h2>
                <p className="text-xs text-gray-500">支持实时联动预览和思维导图</p>
              </div>
              <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                <label className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200">
                  <span className="text-sm leading-none">🖼</span>
                  本地图片
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadLocalImage}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleWebImage}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  <span className="text-sm leading-none">🌐</span>
                  网络图片
                </button>
                <button
                  type="button"
                  onClick={handleWebLink}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  <span className="text-sm leading-none">🔗</span>
                  网页链接
                </button>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {content.length} chars
            </span>
          </div>
          <textarea
            ref={textareaRef}
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
                  components={{
                    a: ({ node: _node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    img: ({ node: _node, ...props }) => (
                      <img {...props} referrerPolicy="no-referrer" />
                    ),
                  }}
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
                    content={mindMapContent || "# No content yet"}
                    onSyncMarkdown={(markdown) => setContent(markdown)}
                  />
                </div>
              </Suspense>
            )}
          </div>
        </section>
      </div>

      <PublishToForumDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        articleId={article.id}
        defaultTitle={article.title}
      />
    </div>
  );
}

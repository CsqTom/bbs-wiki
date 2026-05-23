"use client";

import { Suspense, lazy, useState } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import remarkGfm from "remark-gfm";

const MindMapViewer = lazy(() =>
  import("@/components/wiki/MindMapViewer").then((module) => ({
    default: module.MindMapViewer,
  })),
);

type ViewerMode = "preview" | "mindmap";

interface ShareArticle {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ShareContentViewer({
  title,
  ownerName,
  articleCount,
  expiresLabel,
  articles,
  compact = false,
  defaultMode = "preview",
}: {
  title: string;
  ownerName: string;
  articleCount: number;
  expiresLabel: string;
  articles: ShareArticle[];
  compact?: boolean;
  defaultMode?: ViewerMode;
}) {
  const [viewerMode, setViewerMode] = useState<ViewerMode>(defaultMode);
  const [localModes, setLocalModes] = useState<Record<string, ViewerMode>>({});

  return (
    <div className={compact ? "space-y-6" : "mt-6 space-y-6"}>
      <div className={`bg-white  border border-gray-200 p-8 shadow-sm ${compact ? "rounded-2xl" : "rounded-3xl"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span>wiki分享者：{ownerName}</span>
              <span>文章数：{articleCount}</span>
              <span>{expiresLabel}</span>
            </div>
          </div>
          {articleCount > 1 && (
            <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setViewerMode("preview");
                  setLocalModes({});
                }}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  viewerMode === "preview" && Object.keys(localModes).length === 0
                    ? "bg-blue-700 text-white"
                    : "text-blue-700 hover:bg-blue-100"
                }`}
              >
                统一 Markdown
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewerMode("mindmap");
                  setLocalModes({});
                }}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  viewerMode === "mindmap" && Object.keys(localModes).length === 0
                    ? "bg-blue-700 text-white"
                    : "text-blue-700 hover:bg-blue-100"
                }`}
              >
                统一思维导图
              </button>
            </div>
          )}
        </div>
      </div>

      {articles.map((article, index) => {
        const currentMode = localModes[article.id] || viewerMode;
        
        return (
        <article
          key={article.id}
          id={`article-${article.id}`}
          className={`overflow-hidden bg-white ${compact ? "rounded-2xl border border-gray-200 shadow-sm" : "rounded-3xl border border-gray-200 shadow-sm"}`}
        >
          <header className={`border-b border-gray-200 bg-gray-50 ${compact ? "px-4 py-4" : "px-8 py-6"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                  Article {index + 1} 最近更新：{formatDate(article.updatedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setLocalModes(prev => ({ ...prev, [article.id]: "preview" }))}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                      currentMode === "preview"
                        ? "bg-gray-800 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalModes(prev => ({ ...prev, [article.id]: "mindmap" }))}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                      currentMode === "mindmap"
                        ? "bg-gray-800 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    思维导图
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className={compact ? "px-2 py-2" : "px-2 py-2"}>
            {currentMode === "preview" ? (
              <div className="markdown-preview-panel min-h-[320px] overflow-auto rounded-xl border border-gray-200 bg-white p-6">
                <div className="wmde-markdown-var" />
                <MarkdownPreview
                  source={article.content || "*当前文章暂无内容*"}
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
                  <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <p className="text-gray-500">Loading mind map...</p>
                  </div>
                }
              >
                <div className="h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <MindMapViewer
                    content={article.content || "# 当前文章暂无内容"}
                    readOnly
                  />
                </div>
              </Suspense>
            )}
          </div>
        </article>
        );
      })}
    </div>
  );
}

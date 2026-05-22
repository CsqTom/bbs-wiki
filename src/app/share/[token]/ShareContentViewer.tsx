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
  articles,
}: {
  articles: ShareArticle[];
}) {
  const [viewerMode, setViewerMode] = useState<ViewerMode>("preview");
  const [localModes, setLocalModes] = useState<Record<string, ViewerMode>>({});

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-900">统一内容展示方式</p>
          <p className="mt-1 text-xs text-gray-500">
            切换所有文章的默认视图（单篇文章也可独立调整）。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setViewerMode("preview");
              setLocalModes({});
            }}
            className={`rounded px-3 py-1.5 text-sm transition ${
              viewerMode === "preview" && Object.keys(localModes).length === 0
                ? "bg-blue-700 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
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
            className={`rounded px-3 py-1.5 text-sm transition ${
              viewerMode === "mindmap" && Object.keys(localModes).length === 0
                ? "bg-blue-700 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            统一思维导图
          </button>
        </div>
      </div>

      {articles.map((article, index) => {
        const currentMode = localModes[article.id] || viewerMode;
        
        return (
        <article
          key={article.id}
          id={`article-${article.id}`}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          <header className="border-b border-gray-200 bg-gray-50 px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
                  Article {index + 1}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                  {article.title}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-3">
                <p className="text-xs text-gray-500">
                  最近更新：{formatDate(article.updatedAt)}
                </p>
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

          <div className="px-8 py-8">
            {currentMode === "preview" ? (
              <div className="markdown-preview-panel min-h-[320px] overflow-auto rounded-xl border border-gray-200 bg-white p-6">
                <div className="wmde-markdown-var" />
                <MarkdownPreview
                  source={article.content || "*当前文章暂无内容*"}
                  remarkPlugins={[remarkGfm]}
                  wrapperElement={{ "data-color-mode": "light" }}
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

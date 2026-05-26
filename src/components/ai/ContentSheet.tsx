"use client";

import { useEffect, useState } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import remarkGfm from "remark-gfm";

interface ContentData {
  type: "wiki" | "post";
  title: string;
  content: string;
  updatedAt: string;
  boardName?: string;
}

export function ContentSheet({
  source,
  onClose,
}: {
  source: { id: string; title: string; type: "wiki" | "post" } | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!source) {
      setData(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/ai/content?type=${source.type}&id=${source.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "加载失败");
        }
        return res.json();
      })
      .then((d: ContentData) => {
        setData(d);
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [source]);

  const isOpen = !!source;

  return (
    <>
      {/* Overlay (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-xl transition-all duration-300 md:w-[480px] lg:w-[560px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {source?.title || ""}
            </h3>
            {data && (
              <p className="mt-0.5 text-xs text-gray-500">
                {data.type === "wiki" ? "Wiki 文章" : `论坛帖子${data.boardName ? ` · ${data.boardName}` : ""}`}
                {" · "}
                {new Date(data.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            关闭
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="ml-2">加载中...</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {data && (
            <div className="markdown-preview-panel min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white p-6">
              <div className="wmde-markdown-var" />
              <MarkdownPreview
                source={data.content || "*暂无内容*"}
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
          )}
        </div>
      </div>
    </>
  );
}

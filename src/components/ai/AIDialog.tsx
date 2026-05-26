"use client";

import { useEffect, useRef, useState } from "react";

interface Source {
  id: string;
  title: string;
  type: "wiki" | "post";
  url: string;
}

interface AiResponse {
  answer: string;
  sources: Source[];
}

type AskState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AiResponse }
  | { status: "error"; message: string };

export function AIDialog({
  open,
  onClose,
  onOpenSource,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSource: (id: string, title: string, type: "wiki" | "post") => void;
}) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AskState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setState({ status: "idle" });
      setQuestion("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function handleAsk() {
    const q = question.trim();
    if (!q) return;

    setState({ status: "loading" });

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({
          status: "error",
          message: data.error || "问答服务暂不可用",
        });
        return;
      }

      const data: AiResponse = await res.json();
      setState({ status: "success", data });
    } catch {
      setState({ status: "error", message: "网络错误，请稍后重试" });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  if (!open) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]"
      onClick={onClose}
    >
      {/* Dialog */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI 问答</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              向我提问，我会从您的 Wiki 和论坛内容中寻找答案
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            关闭
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Input */}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入您的问题..."
              disabled={state.status === "loading"}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAsk}
              disabled={state.status === "loading" || !question.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {state.status === "loading" ? "思考中..." : "提问"}
            </button>
          </div>

          {/* Result */}
          <div className="mt-4 min-h-0">
            {state.status === "loading" && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                正在搜索相关内容并生成回答...
              </div>
            )}

            {state.status === "error" && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {state.message}
              </div>
            )}

            {state.status === "success" && (
              <div className="space-y-4">
                {/* Answer */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-800">
                    {state.data.answer}
                  </p>
                </div>

                {/* Sources */}
                {state.data.sources.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      相关来源 ({state.data.sources.length})
                    </h4>
                    <div className="space-y-1.5">
                      {state.data.sources.map((source) => (
                        <button
                          key={`${source.type}-${source.id}`}
                          type="button"
                          onClick={() => onOpenSource(source.id, source.title, source.type)}
                          className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 hover:border-blue-200"
                        >
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                              source.type === "wiki"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {source.type === "wiki" ? "Wiki" : "帖子"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-gray-700">
                            {source.title}
                          </span>
                          <svg
                            className="h-4 w-4 shrink-0 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

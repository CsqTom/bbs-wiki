"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import remarkGfm from "remark-gfm";
import { PostContent } from "@/components/forum/PostContent";
import { extractFirstForumResourceHref } from "@/lib/forum-resource";
import { ShareContentViewer } from "@/app/share/[token]/ShareContentViewer";

const MindMapViewer = lazy(() =>
  import("@/components/wiki/MindMapViewer").then((module) => ({
    default: module.MindMapViewer,
  })),
);

interface PostPreviewUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface PostPreviewComment {
  id: string;
  content: string;
  createdAt: string;
  user: PostPreviewUser;
}

interface WikiContentData {
  type: "wiki";
  title: string;
  content: string;
  updatedAt: string;
}

interface PostContentData {
  type: "post";
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
  boardName?: string;
  user: PostPreviewUser;
  comments: PostPreviewComment[];
}

type ContentData = WikiContentData | PostContentData;

type PreviewPayload =
  | {
      kind: "article";
      title: string;
      content: string;
    }
  | {
      kind: "share";
      title: string;
      articles: Array<{
        id: string;
        title: string;
        content: string;
        updatedAt: string;
      }>;
    };

function renderUserAvatar(name: string) {
  return name[0]?.toUpperCase() || "?";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function WikiContentPanel({ data }: { data: WikiContentData }) {
  return (
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
  );
}

function PostLinkedWikiPreview({ resourceHref }: { resourceHref: string }) {
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/forum-resource/preview?path=${encodeURIComponent(resourceHref)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | (PreviewPayload & { error?: string })
          | { error?: string }
          | null;
        if (!res.ok || !body || !("kind" in body)) {
          throw new Error(body?.error ?? "关联 Wiki 预览加载失败");
        }
        return body as PreviewPayload;
      })
      .then((previewData) => {
        setData(previewData);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "关联 Wiki 预览加载失败",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resourceHref]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-medium text-blue-800">帖子关联 Wiki 预览</p>
        <p className="mt-1 text-xs text-blue-600">{resourceHref}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 text-sm text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="ml-2">正在加载关联 Wiki...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {data?.kind === "share" && (
        <ShareContentViewer
          title={data.title}
          ownerName="帖子内引用"
          articleCount={data.articles.length}
          expiresLabel="来源：分享链接"
          articles={data.articles}
          compact={true}
          defaultMode="mindmap"
        />
      )}

      {data?.kind === "article" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
            <p className="mt-1 text-sm text-gray-500">
              已根据帖子中的 Wiki 链接自动加载对应内容
            </p>
          </div>
          <Suspense
            fallback={
              <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                <p className="text-gray-500">正在加载思维导图...</p>
              </div>
            }
          >
            <div className="h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white">
              <MindMapViewer
                content={data.content || "# 当前文章暂无内容"}
                readOnly
              />
            </div>
          </Suspense>
        </div>
      )}
    </section>
  );
}

function PostContentPanel({
  data,
  postUrl,
}: {
  data: PostContentData;
  postUrl: string;
}) {
  const linkedWikiHref = extractFirstForumResourceHref(data.content);

  return (
    <div className="space-y-6">
      {linkedWikiHref && <PostLinkedWikiPreview resourceHref={linkedWikiHref} />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">{data.title}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {data.boardName ? `版块：${data.boardName} · ` : ""}
              发布时间：{formatDate(data.createdAt)}
              {data.updatedAt !== data.createdAt
                ? ` · 更新于：${formatDate(data.updatedAt)}`
                : ""}
            </p>
          </div>
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            新窗口打开
          </a>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 border-b border-gray-100 pb-4">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
            {renderUserAvatar(data.user.name)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{data.user.name}</div>
            <div>{formatDate(data.createdAt)}</div>
          </div>
        </div>

        <PostContent content={data.content} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          全部回复 ({data.comments.length})
        </h3>
        {data.comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            当前帖子还没有回复。
          </div>
        ) : (
          data.comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 border-b border-gray-100 pb-3">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xs">
                  {renderUserAvatar(comment.user.name)}
                </div>
                <div>
                  <span className="font-medium text-gray-900 mr-2">
                    {comment.user.name}
                  </span>
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
              </div>
              <PostContent content={comment.content} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface LegacyContentData {
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
  source: { id: string; title: string; type: "wiki" | "post"; url: string };
  onClose: () => void;
}) {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/ai/content?type=${source.type}&id=${source.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "加载失败");
        }
        return res.json() as Promise<ContentData | LegacyContentData>;
      })
      .then((responseData) => {
        if (responseData.type === "post") {
          setData(responseData as PostContentData);
          return;
        }
        setData(responseData as WikiContentData);
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [source]);

  return (
    <>
      {/* Overlay (mobile only) */}
      <div
        className="fixed inset-0 z-40 bg-black/20 md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed right-0 top-0 z-[60] flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-xl transition-all duration-300 md:w-[61.8vw] translate-x-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {source.title}
            </h3>
            {data?.type === "post" ? (
              <p className="mt-0.5 text-xs text-gray-500">
                论坛帖子 {data.boardName ? `· ${data.boardName}` : ""} · 完整详情视图
              </p>
            ) : data?.type === "wiki" ? (
              <p className="mt-0.5 text-xs text-gray-500">
                Wiki 文章 ·
                {" "}
                {new Date(data.updatedAt).toLocaleString()}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-500">
                {source.type === "wiki" ? "Wiki 文章" : "论坛帖子"}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              关闭
            </button>
          </div>
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

          {data?.type === "wiki" && <WikiContentPanel data={data} />}

          {data?.type === "post" && (
            <PostContentPanel data={data} postUrl={source.url} />
          )}
        </div>
      </div>
    </>
  );
}

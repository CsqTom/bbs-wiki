"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ForumSplitLayout } from "@/components/forum/ForumSplitLayout";
import { PostContent } from "@/components/forum/PostContent";
import { ForumEditor } from "@/components/forum/ForumEditor";
import { ShareContentViewer } from "@/app/share/[token]/ShareContentViewer";

const MindMapViewer = lazy(() =>
  import("@/components/wiki/MindMapViewer").then((module) => ({
    default: module.MindMapViewer,
  })),
);

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface CommentInfo {
  id: string;
  content: string;
  createdAt: Date;
  user: UserInfo;
}

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

interface PreviewErrorResponse {
  error?: string;
}

function isPreviewPayload(
  data: PreviewPayload | PreviewErrorResponse | null,
): data is PreviewPayload {
  return Boolean(data && "kind" in data);
}

interface PostDetailClientProps {
  post: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    user: UserInfo;
    comments: CommentInfo[];
  };
  wikiPath?: string;
  wikiPreviewContent?:
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
      }
    | null;
  currentUser: any;
  boardId: string;
  canDeletePost: boolean;
  canEditPost: boolean;
  isModerator: boolean;
}

export function PostDetailClient({
  post,
  wikiPath,
  wikiPreviewContent,
  currentUser,
  boardId,
  canDeletePost,
  canEditPost,
  isModerator,
}: PostDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [editingWikiPath, setEditingWikiPath] = useState(wikiPath ?? "");
  const [editingWikiPreview, setEditingWikiPreview] = useState<PreviewPayload | null>(
    wikiPreviewContent ?? null,
  );
  const [isEditingWikiLoading, setIsEditingWikiLoading] = useState(false);

  useEffect(() => {
    setEditingWikiPath(wikiPath ?? "");
    setEditingWikiPreview(wikiPreviewContent ?? null);
  }, [wikiPath, wikiPreviewContent]);

  async function handleDeletePost() {
    if (!confirm("确定要删除这个帖子吗？")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/boards/${boardId}`);
    } else {
      alert("删除失败");
    }
  }

  async function handleSaveEdit(content: string) {
    setEditContent(content);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content }),
    });
    if (res.ok) {
      setIsEditing(false);
      router.refresh();
    } else {
      alert("保存失败");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("确定要删除这条回复吗？")) return;
    const res = await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert("删除失败");
    }
  }

  function canDeleteComment(comment: CommentInfo) {
    if (!currentUser) return false;
    if (isModerator) return true;
    return currentUser.id === comment.user.id;
  }

  async function handleOpenEditingWikiPreview(href: string) {
    try {
      setIsEditingWikiLoading(true);
      setEditingWikiPath(href);

      const res = await fetch(
        `/api/forum-resource/preview?path=${encodeURIComponent(href)}`,
      );
      const data = (await res.json().catch(() => null)) as
        | PreviewPayload
        | PreviewErrorResponse
        | null;

      if (!res.ok || !isPreviewPayload(data)) {
        const errorMessage =
          data && "error" in data ? data.error ?? "预览加载失败" : "预览加载失败";
        throw new Error(errorMessage);
      }

      setEditingWikiPreview(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "预览加载失败";
      setEditingWikiPreview({
        kind: "article",
        title: "预览加载失败",
        content: message,
      });
    } finally {
      setIsEditingWikiLoading(false);
    }
  }

  function handleCloseEditingWikiPreview() {
    setEditingWikiPath("");
    setEditingWikiPreview(null);
    setIsEditingWikiLoading(false);
  }

  const leftPanel = (
    <div className="space-y-8">
      {/* 主贴 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-2xl font-bold border-b pb-2 focus:outline-none focus:border-blue-500"
            />
            <ForumEditor
              content={editContent}
              onContentChange={setEditContent}
              placeholder="编辑内容..."
              submitLabel="保存"
              onCancel={() => setIsEditing(false)}
              onSubmit={handleSaveEdit}
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold">{post.title}</h1>
              <div className="flex gap-2">
                {canEditPost && (
                  <button
                    onClick={() => {
                      setEditTitle(post.title);
                      setEditContent(post.content);
                      setIsEditing(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    编辑
                  </button>
                )}
                {canDeletePost && (
                  <button
                    onClick={handleDeletePost}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {post.user.name[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{post.user.name}</div>
                <div>{new Date(post.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <PostContent content={post.content} />
          </>
        )}
      </div>

      {/* 跟帖列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">全部回复 ({post.comments.length})</h3>
        {post.comments.map((comment) => (
          <div key={comment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xs">
                  {comment.user.name[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="font-medium text-gray-900 mr-2">{comment.user.name}</span>
                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {canDeleteComment(comment) && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  删除
                </button>
              )}
            </div>
            <PostContent content={comment.content} />
          </div>
        ))}
      </div>

      {/* 回复框 */}
      {currentUser ? (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">发表回复</h3>
          <ForumEditor
            placeholder="写下你的回复... 支持 Markdown 和 Wiki 链接"
            submitLabel="发表回复"
            onSubmit={async (content) => {
              const res = await fetch(`/api/posts/${post.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
              });
              if (res.ok) {
                router.refresh();
              } else {
                throw new Error("发表失败");
              }
            }}
          />
        </div>
      ) : (
        <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center text-gray-500">
          请先登录后参与讨论
        </div>
      )}
    </div>
  );

  const rightPanel = isEditing ? (
    <div className="flex h-full bg-white">
      <div className="min-w-0 h-full flex-1">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Markdown 预览</h2>
          <p className="mt-1 text-sm text-gray-500">左侧编辑，右侧实时预览渲染效果</p>
        </div>
        <div className="h-[calc(100%-73px)] overflow-y-auto px-6 py-6">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {editTitle || "未命名标题"}
            </h1>
          </div>
          <PostContent
            content={editContent}
            onForumResourceOpen={handleOpenEditingWikiPreview}
          />
        </div>
      </div>
      {editingWikiPath ? (
        <div className="h-full w-[44%] min-w-[320px] border-l border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900">Wiki 追加预览栏</h3>
              <p className="mt-1 truncate text-sm text-gray-500">{editingWikiPath}</p>
            </div>
            <button
              type="button"
              onClick={handleCloseEditingWikiPreview}
              className="shrink-0 rounded border border-gray-200 px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
          <div className="h-[calc(100%-73px)] overflow-y-auto px-5 py-5">
            {isEditingWikiLoading ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                正在加载链接预览...
              </div>
            ) : editingWikiPreview ? (
              editingWikiPreview.kind === "share" ? (
                <ShareContentViewer
                  title={editingWikiPreview.title}
                  ownerName="主帖编辑预览"
                  articleCount={editingWikiPreview.articles.length}
                  expiresLabel="来源：分享链接"
                  articles={editingWikiPreview.articles}
                  compact={true}
                />
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-5 text-xl font-bold text-gray-900">
                    {editingWikiPreview.title}
                  </h2>
                  <PostContent content={editingWikiPreview.content} />
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                点击 Markdown 预览中的 Wiki 链接后，会在这里打开追加预览栏。
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  ) : wikiPath ? (
    <div className="h-full relative bg-white overflow-hidden">
      <button
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("wikiPath");
          params.set("wikiAuto", "off");
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors shadow-sm"
        title="关闭预览"
      >
        ✕
      </button>
      <div className="h-full overflow-y-auto pt-6 px-6 pb-6">
        {wikiPreviewContent ? (
          wikiPreviewContent.kind === "share" ? (
            <div>
              <ShareContentViewer
                title={wikiPreviewContent.title}
                ownerName="论坛联动预览"
                articleCount={wikiPreviewContent.articles.length}
                expiresLabel="来源：分享链接"
                articles={wikiPreviewContent.articles}
                compact={true}
                defaultMode="mindmap"
              />
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6 pr-8">{wikiPreviewContent.title}</h2>
              <Suspense
                fallback={
                  <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <p className="text-gray-500">正在加载思维导图...</p>
                  </div>
                }
              >
                <div className="h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <MindMapViewer
                    content={wikiPreviewContent.content || "# 当前文章暂无内容"}
                    readOnly
                  />
                </div>
              </Suspense>
            </div>
          )
        ) : (
          <div className="text-gray-500 text-center py-10">加载中或未找到对应内容...</div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <ForumSplitLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      isRightOpen={isEditing || !!wikiPath}
    />
  );
}

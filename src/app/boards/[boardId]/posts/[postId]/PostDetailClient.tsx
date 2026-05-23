"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ForumSplitLayout } from "@/components/forum/ForumSplitLayout";
import { PostContent } from "@/components/forum/PostContent";
import { ForumEditor } from "@/components/forum/ForumEditor";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { ShareContentViewer } from "@/app/share/[token]/ShareContentViewer";

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
}

export function PostDetailClient({
  post,
  wikiPath,
  wikiPreviewContent,
  currentUser,
}: PostDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 依赖注入：左侧为帖子详情与跟帖区
  const leftPanel = (
    <div className="space-y-8">
      {/* 主贴 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
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
      </div>

      {/* 跟帖列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">全部回复 ({post.comments.length})</h3>
        {post.comments.map((comment) => (
          <div key={comment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 border-b border-gray-100 pb-3">
              <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xs">
                {comment.user.name[0]?.toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-gray-900 mr-2">{comment.user.name}</span>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
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

  // 依赖注入：右侧为 Wiki 预览面板
  const rightPanel = wikiPath ? (
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
              />
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-6 pr-8">{wikiPreviewContent.title}</h2>
              <div className="prose max-w-none" data-color-mode="light">
                <MarkdownPreview source={wikiPreviewContent.content} components={{
                  a: ({ node: _node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                  img: ({ node: _node, ...props }) => (
                    <img {...props} referrerPolicy="no-referrer" />
                  ),
                }} />
              </div>
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
      isRightOpen={!!wikiPath}
    />
  );
}

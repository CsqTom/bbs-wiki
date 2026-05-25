import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkModeratorPermission } from "@/lib/auth-utils";
import Link from "next/link";
import { PostDetailClient } from "./PostDetailClient";
import { extractFirstForumResourceHref } from "@/lib/forum-resource";

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

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string; postId: string }>;
  searchParams: Promise<{ wikiPath?: string; wikiAuto?: string }>;
}) {
  const user = await getCurrentUser();
  const { boardId, postId } = await params;
  const { wikiPath, wikiAuto } = await searchParams;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) notFound();

  // 检查版块权限
  if (!board.isPublic) {
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") {
      const hasPermission = await prisma.boardPermission.findUnique({
        where: { boardId_userId: { boardId: board.id, userId: user.id } },
      });
      if (!hasPermission) redirect("/boards");
    }
  }

  // 获取帖子及发帖人信息
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      comments: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!post) notFound();

  // 计算用户权限
  let canDeletePost = false;
  let canEditPost = false;
  let isModerator = false;

  if (user) {
    canEditPost = user.id === post.userId;
    isModerator = user.role === "ADMIN" || await checkModeratorPermission(user.id, boardId);
    canDeletePost = isModerator;
  }

  const autoWikiPath =
    wikiAuto === "off" ? null : extractFirstForumResourceHref(post.content);
  const resolvedWikiPath = wikiPath ?? autoWikiPath ?? undefined;

  // 如果传入了论坛资源链接，尝试在服务端解析出对应的 Wiki / 分享内容。
  let wikiPreviewContent: PreviewPayload | null = null;
  if (resolvedWikiPath && resolvedWikiPath.startsWith("/wiki/")) {
    const slugPath = resolvedWikiPath.replace("/wiki/", "").split("/");
    const targetSlug = slugPath[slugPath.length - 1];

    if (targetSlug) {
      const article = await prisma.wikiArticle.findFirst({
        where: { slug: targetSlug },
      });
      if (article) {
        wikiPreviewContent = {
          kind: "article",
          title: article.title,
          content: article.content,
        };
      } else {
        wikiPreviewContent = {
          kind: "article",
          title: "目录或未找到",
          content: "该链接指向一个目录或未找到对应文章内容。",
        };
      }
    }
  } else if (resolvedWikiPath && resolvedWikiPath.startsWith("/share/")) {
    const token = resolvedWikiPath.replace("/share/", "").split("/")[0].split("?")[0];
    const shareLink = await prisma.wikiShareLink.findUnique({
      where: { token },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                content: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (shareLink) {
      wikiPreviewContent = {
        kind: "share",
        title: shareLink.title ?? "Wiki 分享",
        articles: shareLink.items.map(({ article }) => ({
          id: article.id,
          title: article.title,
          content: article.content,
          updatedAt: article.updatedAt.toISOString(),
        })),
      };
    } else {
      wikiPreviewContent = {
        kind: "article",
        title: "分享未找到",
        content: "该分享链接不存在，或已被删除。",
      };
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Link
          href={`/boards/${boardId}`}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
        >
          ← 返回版块
        </Link>
      </div>

      <PostDetailClient
        post={post}
        wikiPath={resolvedWikiPath}
        wikiPreviewContent={wikiPreviewContent}
        currentUser={user}
        boardId={boardId}
        canDeletePost={canDeletePost}
        canEditPost={canEditPost}
        isModerator={isModerator}
      />
    </div>
  );
}

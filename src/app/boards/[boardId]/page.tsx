import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import Link from "next/link";
import { CreatePostClient } from "./CreatePostClient";
import { extractThumbnail, stripMarkdown } from "@/lib/text-utils";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  const { boardId } = await params;
  const { page } = await searchParams;
  
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const PAGE_SIZE = 10;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) notFound();

  // Check access
  if (!board.isPublic) {
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") {
      const hasPermission = await prisma.boardPermission.findUnique({
        where: { boardId_userId: { boardId: board.id, userId: user.id } },
      });
      if (!hasPermission) redirect("/boards");
    }
  }

  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: { boardId: board.id },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count({
      where: { boardId: board.id },
    }),
  ]);

  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);

  return (
    <div className="flex h-full flex-col p-6 overflow-y-auto">
      <div className="mb-6 border-b border-gray-200 pb-4 relative">
        <div className="pr-36">
          <h1 className="text-2xl font-bold mb-2">{board.name}</h1>
          {board.description && (
            <p className="text-gray-600">{board.description}</p>
          )}
        </div>
        {user && (
          <CreatePostClient
            boardId={board.id}
            triggerClassName="absolute right-0 top-0"
          />
        )}
      </div>

      <div className="flex-1">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500">
              当前版块暂无帖子，快来发布第一篇吧！
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {posts.map((post) => {
              const thumbnail = extractThumbnail(post.content);
              const plainText = stripMarkdown(post.content);

              return (
                <Link
                  href={`/boards/${board.id}/posts/${post.id}`}
                  key={post.id}
                  className="block border-b border-gray-100 px-5 py-3 transition-colors last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <h3 className="truncate pr-2 text-lg font-semibold leading-snug text-gray-900">
                          {post.title}
                        </h3>
                        {post.syncEnabled && (
                          <span className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-600">
                            wiki分享
                          </span>
                        )}
                      </div>
                      <div className="mb-2 line-clamp-2 text-sm leading-5 text-gray-400">
                        {plainText || "暂无文字内容"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs leading-none text-gray-400">
                        <span className="font-medium">{post.user.name}</span>
                        <span>·</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {thumbnail && (
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbnail}
                          alt="封面"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={`/boards/${board.id}?page=${currentPage - 1}`}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              上一页
            </Link>
          ) : (
            <button disabled className="px-4 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed">
              上一页
            </button>
          )}
          
          <span className="text-sm text-gray-600 px-4">
            {currentPage} / {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link
              href={`/boards/${board.id}?page=${currentPage + 1}`}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              下一页
            </Link>
          ) : (
            <button disabled className="px-4 py-2 text-sm bg-gray-50 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed">
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
}

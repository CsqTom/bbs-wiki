import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import Link from "next/link";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const user = await getCurrentUser();
  const { boardId } = await params;

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

  const posts = await prisma.post.findMany({
    where: { boardId: board.id },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/boards"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Boards
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">{board.name}</h1>
      {board.description && (
        <p className="text-gray-600 mb-6">{board.description}</p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-lg">{post.title}</h3>
              {post.syncEnabled && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Synced from Wiki
                </span>
              )}
            </div>
            <div className="prose max-w-none text-sm text-gray-700">
              {post.content.substring(0, 500)}
              {post.content.length > 500 && "..."}
            </div>
            <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
              <span>
                Posted by {post.user.name} on{" "}
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No posts in this board yet.
          </p>
        )}
      </div>
    </div>
  );
}

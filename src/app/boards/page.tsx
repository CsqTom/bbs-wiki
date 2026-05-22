import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

export default async function BoardsPage() {
  const user = await getCurrentUser();

  const firstPublicBoard = await prisma.board.findFirst({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });

  if (firstPublicBoard) {
    redirect(`/boards/${firstPublicBoard.id}`);
  }

  if (user) {
    const firstPrivateBoard = await prisma.board.findFirst({
      where: {
        isPublic: false,
        boardPermissions: { some: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (firstPrivateBoard) {
      redirect(`/boards/${firstPrivateBoard.id}`);
    }
    
    if (user.role === "ADMIN") {
      const firstAdminBoard = await prisma.board.findFirst({
        where: { isPublic: false },
        orderBy: { createdAt: "desc" },
      });
      if (firstAdminBoard) {
        redirect(`/boards/${firstAdminBoard.id}`);
      }
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center text-gray-500">
        <p className="text-lg">暂无可用版块</p>
        {user?.role === "ADMIN" && (
          <p className="mt-2 text-sm">请前往管理后台创建版块</p>
        )}
      </div>
    </div>
  );
}

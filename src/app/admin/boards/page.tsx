import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { BoardList } from "./BoardList";

export default async function AdminBoardsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const boards = await prisma.board.findMany({
    include: { boardPermissions: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">版块管理</h1>
      <BoardList boards={boards} allUsers={users} />
    </div>
  );
}

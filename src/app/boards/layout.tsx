import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { BoardsShell } from "./BoardsShell";

export default async function BoardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const publicBoards = await prisma.board.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });

  let privateBoards: typeof publicBoards = [];
  if (user) {
    privateBoards = await prisma.board.findMany({
      where: {
        isPublic: false,
        boardPermissions: { some: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  let allBoards: typeof publicBoards = [];
  if (user?.role === "ADMIN") {
    const permittedBoards = await prisma.board.findMany({
      where: { isPublic: false },
      orderBy: { createdAt: "desc" },
    });
    allBoards = permittedBoards.filter(
      (b) => !privateBoards.find((pb) => pb.id === b.id),
    );
  }

  const allPrivateBoards = [...privateBoards, ...allBoards];

  return (
    <BoardsShell publicBoards={publicBoards} privateBoards={allPrivateBoards}>
      {children}
    </BoardsShell>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ForumSidebar } from "./ForumSidebar";

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
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[720px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <ForumSidebar 
        publicBoards={publicBoards} 
        privateBoards={allPrivateBoards} 
      />

      <section className="min-w-0 flex-1 bg-gray-50 flex flex-col">
        {children}
      </section>
    </div>
  );
}

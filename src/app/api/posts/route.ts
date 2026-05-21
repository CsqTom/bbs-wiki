import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireAuth();

  const { boardId, title, content, sourceType, sourceId } =
    await request.json();

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Check board access
  if (!board.isPublic && user.role !== "ADMIN") {
    const hasPermission = await prisma.boardPermission.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: user.id } },
    });
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }
  }

  const post = await prisma.post.create({
    data: {
      boardId,
      userId: user.id,
      title,
      content,
      sourceType,
      sourceId,
    },
  });

  return NextResponse.json(post);
}

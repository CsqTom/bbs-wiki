import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { boardId, title, content, sourceType, sourceId } =
      await request.json();

    if (!boardId || !title?.trim()) {
      return NextResponse.json(
        { error: "版块和标题不能为空" },
        { status: 400 },
      );
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // 检查版块访问权限
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

    const hasWikiSource = Boolean(sourceType && sourceId);

    const post = await prisma.post.create({
      data: {
        boardId,
        userId: user.id,
        title: title.trim(),
        content: typeof content === "string" ? content : "",
        syncEnabled: hasWikiSource,
        ...(hasWikiSource ? { sourceType, sourceId } : {}),
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json({ error: "发帖失败" }, { status: 500 });
  }
}

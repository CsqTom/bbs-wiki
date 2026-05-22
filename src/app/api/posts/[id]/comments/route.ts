import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: postId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { board: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check board access
    if (!post.board.isPublic && user.role !== "ADMIN") {
      const hasPermission = await prisma.boardPermission.findUnique({
        where: { boardId_userId: { boardId: post.boardId, userId: user.id } },
      });
      if (!hasPermission) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId: user.id,
        content,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      }
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

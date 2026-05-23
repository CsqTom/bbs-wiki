import { NextResponse } from "next/server";
import { requireAuth, canDeleteComment } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const user = await requireAuth();
    const { id: postId, commentId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { boardId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { postId: true, userId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    if (comment.postId !== postId) {
      return NextResponse.json({ error: "评论不属于该帖子" }, { status: 400 });
    }

    const canDelete = await canDeleteComment(user.id, comment, post.boardId);
    if (!canDelete) {
      return NextResponse.json({ error: "无删除权限" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除评论失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAuth, canDeletePost, canEditPost } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id: postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { boardId: true, userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const canDelete = await canDeletePost(user.id, post);
    if (!canDelete) {
      return NextResponse.json({ error: "无删除权限" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id: postId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除帖子失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id: postId } = await params;
    const { title, content } = await request.json();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { boardId: true, userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    const canEdit = await canEditPost(user.id, post);
    if (!canEdit) {
      return NextResponse.json({ error: "无编辑权限" }, { status: 403 });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("更新帖子失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

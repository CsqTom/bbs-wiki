import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  if (type === "wiki") {
    const article = await prisma.wikiArticle.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // Check access: owner or collaborator
    const isOwner = article.userId === user.id;
    const isCollab = await prisma.wikiCollaborator.findUnique({
      where: { articleId_userId: { articleId: id, userId: user.id } },
    });
    if (!isOwner && !isCollab) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    return NextResponse.json({
      type: "wiki" as const,
      title: article.title,
      content: article.content,
      updatedAt: article.updatedAt.toISOString(),
    });
  }

  if (type === "post") {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        board: { select: { id: true, name: true, isPublic: true } },
      },
    });
    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // Check board access
    if (!post.board.isPublic) {
      const perm = await prisma.boardPermission.findUnique({
        where: { boardId_userId: { boardId: post.board.id, userId: user.id } },
      });
      if (!perm && user.role !== "ADMIN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }
    }

    return NextResponse.json({
      type: "post" as const,
      title: post.title,
      content: post.content,
      boardName: post.board.name,
      updatedAt: post.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({ error: "未知类型" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");

  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const article = await prisma.wikiArticle.findUnique({
    where: { id: articleId },
    select: { userId: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const isOwner = article.userId === user.id;
  const isCollab = !isOwner && await prisma.wikiCollaborator.findUnique({
    where: { articleId_userId: { articleId, userId: user.id } },
  });

  if (!isOwner && !isCollab) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const collaborators = await prisma.wikiCollaborator.findMany({
    where: { articleId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(collaborators);
}

export async function POST(request: Request) {
  const user = await requireAuth();
  const { articleId, userId: targetUserId } = await request.json();

  const article = await prisma.wikiArticle.findUnique({
    where: { id: articleId },
    select: { userId: true },
  });
  if (!article || article.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot add yourself as collaborator" }, { status: 400 });
  }

  const collaborator = await prisma.wikiCollaborator.create({
    data: { articleId, userId: targetUserId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(collaborator);
}

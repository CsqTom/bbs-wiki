import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { updateEditableWikiArticle } from "@/lib/wiki-article";

async function collectDirectoryIds(rootId: string, userId: string) {
  const directories = await prisma.wikiDirectory.findMany({
    where: { userId },
    select: { id: true, parentId: true },
  });
  const childrenMap = new Map<string, string[]>();

  for (const directory of directories) {
    if (!directory.parentId) continue;
    const siblings = childrenMap.get(directory.parentId) ?? [];
    siblings.push(directory.id);
    childrenMap.set(directory.parentId, siblings);
  }

  // 用内存 DFS 收集整个目录子树，避免为每一层单独发查询。
  const collected = new Set<string>([rootId]);
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) continue;

    for (const childId of childrenMap.get(currentId) ?? []) {
      if (collected.has(childId)) continue;
      collected.add(childId);
      stack.push(childId);
    }
  }

  return Array.from(collected);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { content, title } = await request.json();

    const result = await updateEditableWikiArticle(
      { prisma },
      id,
      user.id,
      { content, title },
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason === "not_found" ? "Not found" : "Forbidden" },
        { status: result.reason === "not_found" ? 404 : 403 },
      );
    }

    return NextResponse.json(result.article);
  } catch (error) {
    console.error("[wiki] 更新文章失败", error);
    return NextResponse.json(
      { error: "更新失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "article") {
    const article = await prisma.wikiArticle.findFirst({
      where: { id, userId: user.id },
      select: { id: true, title: true },
    });
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.wikiArticle.delete({ where: { id: article.id } });
    return NextResponse.json({
      deletedType: "article",
      deletedCount: 1,
      deletedTitle: article.title,
    });
  }

  if (type === "directory") {
    const directory = await prisma.wikiDirectory.findFirst({
      where: { id, userId: user.id },
      select: { id: true, name: true },
    });
    if (!directory) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const directoryIds = await collectDirectoryIds(directory.id, user.id);

    const deletedStats = await prisma.$transaction(async (tx) => {
      const articles = await tx.wikiArticle.findMany({
        where: {
          userId: user.id,
          directoryId: { in: directoryIds },
        },
        select: { id: true },
      });

      const deletedArticles = await tx.wikiArticle.deleteMany({
        where: {
          userId: user.id,
          directoryId: { in: directoryIds },
        },
      });

      if (articles.length > 0) {
        await tx.post.deleteMany({
          where: { sourceId: { in: articles.map((article) => article.id) } },
        });
      }

      const deletedDirectories = await tx.wikiDirectory.deleteMany({
        where: {
          userId: user.id,
          id: { in: directoryIds },
        },
      });

      return {
        articleCount: deletedArticles.count,
        directoryCount: deletedDirectories.count,
      };
    });

    return NextResponse.json({
      deletedType: "directory",
      deletedName: directory.name,
      ...deletedStats,
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

function buildShareTitle(articleTitles: string[]) {
  if (articleTitles.length === 1) {
    return articleTitles[0];
  }

  return `${articleTitles[0]} 等 ${articleTitles.length} 篇文章`;
}

function buildShareUrl(origin: string, token: string, title: string | null) {
  if (!title) return `${origin}/share/${token}`;
  return `${origin}/share/${token}/${slugify(title)}`;
}

export async function POST(request: Request) {
  const user = await requireAuth();
  const payload = (await request.json()) as {
    articleIds?: string[];
    expiresInHours?: number | null;
  };

  const articleIds = Array.from(
    new Set(
      Array.isArray(payload.articleIds)
        ? payload.articleIds.filter((id): id is string => typeof id === "string")
        : [],
    ),
  );

  if (articleIds.length === 0) {
    return NextResponse.json(
      { error: "请至少选择一篇文章后再生成分享链接。" },
      { status: 400 },
    );
  }

  const articles = await prisma.wikiArticle.findMany({
    where: {
      id: { in: articleIds },
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (articles.length !== articleIds.length) {
    return NextResponse.json(
      { error: "存在无权访问的文章，无法生成分享链接。" },
      { status: 403 },
    );
  }

  const articleMap = new Map(articles.map((article) => [article.id, article]));
  const orderedArticles = articleIds
    .map((articleId) => articleMap.get(articleId))
    .filter((article) => article !== undefined);

  const expiresInHours =
    typeof payload.expiresInHours === "number" &&
    Number.isFinite(payload.expiresInHours) &&
    payload.expiresInHours > 0
      ? payload.expiresInHours
      : null;

  const expiresAt =
    expiresInHours === null
      ? null
      : new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const shareLink = await prisma.wikiShareLink.create({
    data: {
      userId: user.id,
      token: crypto.randomUUID().replace(/-/g, ""),
      title: buildShareTitle(orderedArticles.map((article) => article.title)),
      expiresAt,
      items: {
        create: orderedArticles.map((article, index) => ({
          articleId: article.id,
          sortOrder: index,
        })),
      },
    },
    select: {
      id: true,
      token: true,
      title: true,
      expiresAt: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          article: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const origin = new URL(request.url).origin;
  const shareUrl = buildShareUrl(origin, shareLink.token, shareLink.title);

  return NextResponse.json({
    id: shareLink.id,
    token: shareLink.token,
    title: shareLink.title,
    expiresAt: shareLink.expiresAt?.toISOString() ?? null,
    articleCount: shareLink.items.length,
    articleTitles: shareLink.items.map((item) => item.article.title),
    shareUrl,
  });
}

export async function GET(request: Request) {
  const user = await requireAuth();
  const shareLinks = await prisma.wikiShareLink.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          article: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  const origin = new URL(request.url).origin;

  return NextResponse.json({
    items: shareLinks.map((shareLink) => ({
      id: shareLink.id,
      token: shareLink.token,
      title: shareLink.title,
      expiresAt: shareLink.expiresAt?.toISOString() ?? null,
      createdAt: shareLink.createdAt.toISOString(),
      articleCount: shareLink.items.length,
      articleTitles: shareLink.items.map((item) => item.article.title),
      shareUrl: buildShareUrl(origin, shareLink.token, shareLink.title),
    })),
  });
}

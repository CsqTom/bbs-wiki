import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { ShareManager } from "../ShareManager";

function buildShareUrl(token: string, title: string | null) {
  if (!title) return `/share/${token}`;
  return `/share/${token}/${slugify(title)}`;
}

export default async function WikiSharesPage({
  searchParams,
}: {
  searchParams: Promise<{ articleId?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ articleId }, directories, rootArticles, shareLinks] = await Promise.all([
    searchParams,
    prisma.wikiDirectory.findMany({
      where: { userId: user.id },
      include: {
        wikiArticles: {
          orderBy: { title: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.wikiArticle.findMany({
      where: { userId: user.id, directoryId: null },
      orderBy: { title: "asc" },
    }),
    prisma.wikiShareLink.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            article: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const initialSelectedArticleIds = Array.isArray(articleId)
    ? articleId
    : articleId
      ? [articleId]
      : [];

  return (
    <ShareManager
      directories={directories.map((directory) => ({
        id: directory.id,
        name: directory.name,
        slug: directory.slug,
        parentId: directory.parentId,
        wikiArticles: directory.wikiArticles.map((article) => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          directoryId: article.directoryId,
        })),
      }))}
      rootArticles={rootArticles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        directoryId: article.directoryId,
      }))}
      shareLinks={shareLinks.map((shareLink) => ({
        id: shareLink.id,
        token: shareLink.token,
        title: shareLink.title,
        expiresAt: shareLink.expiresAt?.toISOString() ?? null,
        createdAt: shareLink.createdAt.toISOString(),
        articleCount: shareLink.items.length,
        articleTitles: shareLink.items.map((item) => item.article.title),
        shareUrl: buildShareUrl(shareLink.token, shareLink.title),
      }))}
      initialSelectedArticleIds={initialSelectedArticleIds}
    />
  );
}

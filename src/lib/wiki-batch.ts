import type { PrismaClient } from "@/generated/prisma/client";
import { slugify } from "./slugify";

export interface WikiMarkdownImportItem {
  fileName: string;
  title: string;
  content: string;
  directoryId: string | null;
}

export interface WikiImportedArticleSummary {
  id: string;
  title: string;
  slug: string;
  directoryId: string | null;
}

export interface WikiExportMarkdownFile {
  articleId: string;
  title: string;
  fileName: string;
  content: string;
  updatedAt: string;
}

interface WikiBatchServiceDependencies {
  prisma: PrismaClient;
}

function normalizeArticleTitle(title: string) {
  const normalized = title.trim();
  return normalized || "未命名文档";
}

function buildUniqueTitle(baseTitle: string, usedTitles: Set<string>) {
  const normalizedBase = normalizeArticleTitle(baseTitle);
  let candidate = normalizedBase;
  let suffix = 2;

  while (usedTitles.has(candidate)) {
    candidate = `${normalizedBase} (${suffix})`;
    suffix += 1;
  }

  usedTitles.add(candidate);
  return candidate;
}

function buildUniqueSlug(baseTitle: string, usedSlugs: Set<string>) {
  const normalizedBase = slugify(baseTitle) || slugify("article");
  let candidate = normalizedBase;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}

function sanitizeMarkdownFileBaseName(title: string) {
  const sanitized = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");

  return sanitized || "wiki-export";
}

function buildUniqueMarkdownFileName(title: string, usedNames: Set<string>) {
  const baseName = sanitizeMarkdownFileBaseName(title);
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${suffix})`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return `${candidate}.md`;
}

function buildDirectoryStateKey(directoryId: string | null) {
  return directoryId ?? "__root__";
}

export function createWikiBatchService({
  prisma,
}: WikiBatchServiceDependencies) {
  return {
    async importMarkdownFiles({
      userId,
      items,
    }: {
      userId: string;
      items: WikiMarkdownImportItem[];
    }) {
      if (items.length === 0) {
        return {
          count: 0,
          created: [] as WikiImportedArticleSummary[],
        };
      }

      const requestedDirectoryIds = Array.from(
        new Set(
          items
            .map((item) => item.directoryId)
            .filter((directoryId): directoryId is string => Boolean(directoryId)),
        ),
      );

      if (requestedDirectoryIds.length > 0) {
        const ownedDirectories = await prisma.wikiDirectory.findMany({
          where: {
            userId,
            id: { in: requestedDirectoryIds },
          },
          select: { id: true },
        });

        if (ownedDirectories.length !== requestedDirectoryIds.length) {
          throw new Error("目标目录不存在或无权限导入。");
        }
      }

      return prisma.$transaction(async (tx) => {
        const existingArticles = await tx.wikiArticle.findMany({
          where: {
            userId,
            OR: [
              { directoryId: null },
              ...(requestedDirectoryIds.length > 0
                ? [{ directoryId: { in: requestedDirectoryIds } }]
                : []),
            ],
          },
          select: {
            directoryId: true,
            title: true,
            slug: true,
          },
        });

        const states = new Map<
          string,
          {
            usedTitles: Set<string>;
            usedSlugs: Set<string>;
          }
        >();

        for (const article of existingArticles) {
          const stateKey = buildDirectoryStateKey(article.directoryId);
          const current = states.get(stateKey) ?? {
            usedTitles: new Set<string>(),
            usedSlugs: new Set<string>(),
          };
          current.usedTitles.add(article.title);
          current.usedSlugs.add(article.slug);
          states.set(stateKey, current);
        }

        const created: WikiImportedArticleSummary[] = [];

        for (const item of items) {
          const stateKey = buildDirectoryStateKey(item.directoryId);
          const current = states.get(stateKey) ?? {
            usedTitles: new Set<string>(),
            usedSlugs: new Set<string>(),
          };

          const title = buildUniqueTitle(item.title, current.usedTitles);
          const slug = buildUniqueSlug(title, current.usedSlugs);

          states.set(stateKey, current);

          const article = await tx.wikiArticle.create({
            data: {
              userId,
              directoryId: item.directoryId,
              title,
              slug,
              content: item.content,
            },
            select: {
              id: true,
              title: true,
              slug: true,
              directoryId: true,
            },
          });

          created.push(article);
        }

        return {
          count: created.length,
          created,
        };
      });
    },

    async exportMarkdownFiles({
      userId,
      articleIds,
    }: {
      userId: string;
      articleIds: string[];
    }) {
      if (articleIds.length === 0) {
        return [];
      }

      const articles = await prisma.wikiArticle.findMany({
        where: {
          userId,
          id: { in: articleIds },
        },
        select: {
          id: true,
          title: true,
          content: true,
          updatedAt: true,
        },
      });

      const articleMap = new Map(articles.map((article) => [article.id, article]));
      const usedNames = new Set<string>();

      return articleIds.flatMap<WikiExportMarkdownFile>((articleId) => {
        const article = articleMap.get(articleId);
        if (!article) return [];

        return [
          {
            articleId: article.id,
            title: article.title,
            fileName: buildUniqueMarkdownFileName(article.title, usedNames),
            content: article.content,
            updatedAt: article.updatedAt.toISOString(),
          },
        ];
      });
    },
  };
}

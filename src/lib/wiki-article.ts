import type { PrismaClient, WikiArticle } from "@/generated/prisma/client";

type WikiArticleAccessDependencies = Pick<
  PrismaClient,
  "wikiArticle" | "wikiCollaborator"
>;

type WikiArticleMutableData = {
  content?: string;
  title?: string;
};

type WikiArticleAccessResult =
  | {
      ok: true;
      article: Pick<WikiArticle, "id" | "userId">;
    }
  | {
      ok: false;
      reason: "not_found" | "forbidden";
    };

type WikiArticleUpdateResult =
  | {
      ok: true;
      article: WikiArticle;
    }
  | {
      ok: false;
      reason: "not_found" | "forbidden";
    };

export interface WikiArticleServiceDependencies {
  prisma: WikiArticleAccessDependencies;
}

export async function ensureWikiArticleEditable(
  deps: WikiArticleServiceDependencies,
  articleId: string,
  userId: string,
): Promise<WikiArticleAccessResult> {
  const article = await deps.prisma.wikiArticle.findUnique({
    where: { id: articleId },
    select: { id: true, userId: true },
  });

  if (!article) {
    return { ok: false, reason: "not_found" };
  }

  if (article.userId === userId) {
    return { ok: true, article };
  }

  const collaborator = await deps.prisma.wikiCollaborator.findUnique({
    where: {
      articleId_userId: { articleId, userId },
    },
    select: { articleId: true },
  });

  if (!collaborator) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, article };
}

export async function updateEditableWikiArticle(
  deps: WikiArticleServiceDependencies,
  articleId: string,
  userId: string,
  data: WikiArticleMutableData,
): Promise<WikiArticleUpdateResult> {
  const access = await ensureWikiArticleEditable(deps, articleId, userId);
  if (!access.ok) {
    return access;
  }

  const updatedArticle = await deps.prisma.wikiArticle.update({
    where: { id: articleId },
    data: {
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
    },
  });

  return { ok: true, article: updatedArticle };
}

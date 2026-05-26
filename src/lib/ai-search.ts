import { prisma } from "@/lib/prisma";

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  type: "wiki" | "post";
  url: string;
  score: number;
}

function extractKeywords(text: string): string[] {
  return text
    .replace(/['\\]/g, " ")
    .split(/[\s,，。.！!？?、；;：:""''（）()【】\[\]{}]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/**
 * Build a set of ILIKE conditions joined by OR for multi-keyword search.
 * Each keyword will match against (title || content). This handles both
 * Chinese (which tsvector can't segment) and English text.
 */
function buildKeywordConditions(
  keywords: string[],
  paramStart: number,
): { conditions: string[]; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];

  for (const kw of keywords) {
    // Match in title or content
    conditions.push(
      `(coalesce(title,'') || ' ' || coalesce(content,'')) ILIKE $${paramStart + params.length}`,
    );
    params.push(`%${kw}%`);
  }

  return { conditions, params };
}

/** Search wiki articles the user can access (own + collaborative). */
async function searchWikiArticles(
  userId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Get collaborator article IDs
  const collabRows = await prisma.wikiCollaborator.findMany({
    where: { userId },
    select: { articleId: true },
  });
  const collabIds = collabRows.map((r) => r.articleId);

  const kw = buildKeywordConditions(keywords, 4); // $1=userId, $2=collabIds, $3=limit, $4=keywordCount
  const keywordConditions = kw.conditions.join(" OR ");

  // Score: count how many keywords match in title (weighted 3x) and content
  const scoreExpr = keywords
    .map(
      (_k, i) =>
        `(CASE WHEN title ILIKE $${4 + i} THEN 3 ELSE 0 END) + (CASE WHEN content ILIKE $${4 + i} THEN 1 ELSE 0 END)`,
    )
    .join(" + ");

  const params: unknown[] = [
    userId,
    collabIds.length > 0 ? collabIds : [""],
    limit,
    ...kw.params,
  ];

  const articles = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id, title, content, (${scoreExpr}) AS score
     FROM "WikiArticle"
     WHERE ("userId" = $1 OR id = ANY($2::text[]))
       AND (${keywordConditions})
     ORDER BY score DESC
     LIMIT $3`,
    ...params,
  );

  return articles.map((row: any) => ({
    id: row.id,
    title: row.title,
    snippet:
      row.content.length > 300
        ? row.content.slice(0, 300) + "..."
        : row.content,
    type: "wiki" as const,
    url: `/wiki/${row.id}`,
    score: Number(row.score) || 0,
  }));
}

/** Search forum posts on boards the user can see (public + permitted). */
async function searchForumPosts(
  userId: string | undefined,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Get accessible board IDs
  const publicBoards = await prisma.board.findMany({
    where: { isPublic: true },
    select: { id: true },
  });
  const accessibleBoardIds = new Set(publicBoards.map((b) => b.id));

  if (userId) {
    const permittedBoards = await prisma.boardPermission.findMany({
      where: { userId },
      select: { boardId: true },
    });
    for (const p of permittedBoards) accessibleBoardIds.add(p.boardId);
  }

  if (accessibleBoardIds.size === 0) return [];

  const boardIds = [...accessibleBoardIds];

  const kw = buildKeywordConditions(keywords, 3); // $1=boardIds, $2=limit, $3+=keywords
  const keywordConditions = kw.conditions.join(" OR ");

  const scoreExpr = keywords
    .map(
      (_k, i) =>
        `(CASE WHEN p.title ILIKE $${3 + i} THEN 3 ELSE 0 END) + (CASE WHEN p.content ILIKE $${3 + i} THEN 1 ELSE 0 END)`,
    )
    .join(" + ");

  const params: unknown[] = [
    boardIds,
    limit,
    ...kw.params,
  ];

  const posts = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT p.id, p.title, p.content, b.id AS board_id, b.name AS board_name, (${scoreExpr}) AS score
     FROM "Post" p
     JOIN "Board" b ON b.id = p."boardId"
     WHERE p."boardId" = ANY($1::text[])
       AND (${keywordConditions})
     ORDER BY score DESC
     LIMIT $2`,
    ...params,
  );

  return posts.map((row: any) => ({
    id: row.id,
    title: row.title,
    snippet:
      row.content.length > 300
        ? row.content.slice(0, 300) + "..."
        : row.content,
    type: "post" as const,
    url: `/boards/${row.board_id || "unknown"}/posts/${row.id}`,
    score: Number(row.score) || 0,
  }));
}

/**
 * Search all accessible content (wiki articles + forum posts) for the given query.
 */
export async function searchAllContent(
  userId: string | undefined,
  query: string,
  options?: { limit?: number },
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 10;

  const [wikiResults, postResults] = await Promise.all([
    searchWikiArticles(userId || "", query, limit),
    searchForumPosts(userId, query, limit),
  ]);

  // Merge and sort by relevance score
  const merged = [...wikiResults, ...postResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return merged;
}

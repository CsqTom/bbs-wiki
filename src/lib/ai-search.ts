import { prisma } from "@/lib/prisma";

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  type: "wiki" | "post";
  url: string;
  score: number;
}

const SNIPPET_MAX_LEN = 2000;

function getRowString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

// ── pg_search / BM25 detection + setup ──────────────────────────

type SearchEngine = "bm25" | "ilike";
let _engine: SearchEngine | "probing" | undefined = "probing";
let _engineInitPromise: Promise<SearchEngine> | null = null;

type Bm25Attempt = {
  name: string;
  buildSql: (tableName: string) => string;
};

const BM25_INDEX_NAMES = [
  "idx_wikiarticle_bm25",
  "idx_post_bm25",
] as const;

const BM25_ATTEMPTS: Bm25Attempt[] = [
  {
    name: "bm25+jieba",
    buildSql: (tableName) =>
      `CREATE INDEX IF NOT EXISTS idx_${tableName.toLowerCase()}_bm25 ON "${tableName}" ` +
      `USING bm25 ("id", ("title"::pdb.jieba), ("content"::pdb.jieba)) ` +
      `WITH (key_field = 'id')`,
  },
  {
    name: "bm25+chinese_compatible",
    buildSql: (tableName) =>
      `CREATE INDEX IF NOT EXISTS idx_${tableName.toLowerCase()}_bm25 ON "${tableName}" ` +
      `USING bm25 ("id", ("title"::pdb.chinese_compatible), ("content"::pdb.chinese_compatible)) ` +
      `WITH (key_field = 'id')`,
  },
  {
    name: "bm25",
    buildSql: (tableName) =>
      `CREATE INDEX IF NOT EXISTS idx_${tableName.toLowerCase()}_bm25 ON "${tableName}" ` +
      `USING bm25 ("id", "title", "content") ` +
      `WITH (key_field = 'id')`,
  },
];

async function verifyBm25Query(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT id FROM "WikiArticle" WHERE "WikiArticle" @@@ 'test' LIMIT 1`,
    );
    return true;
  } catch {
    return false;
  }
}

async function hasBm25Index(indexName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ regclass: string | null }>>(
    "SELECT to_regclass($1)::text AS regclass",
    indexName,
  );
  return Boolean(rows[0]?.regclass);
}

async function hasRequiredBm25Indexes(): Promise<boolean> {
  const checks = await Promise.all(BM25_INDEX_NAMES.map((name) => hasBm25Index(name)));
  return checks.every(Boolean);
}

async function dropBm25Indexes(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'DROP INDEX IF EXISTS idx_post_bm25',
  ).catch(() => {});
  await prisma.$executeRawUnsafe(
    'DROP INDEX IF EXISTS idx_wikiarticle_bm25',
  ).catch(() => {});
  await prisma.$executeRawUnsafe(
    'DROP INDEX IF EXISTS idx_wiki_article_bm25',
  ).catch(() => {});
}

async function createBm25Indexes(attempt: Bm25Attempt): Promise<void> {
  await prisma.$executeRawUnsafe(attempt.buildSql("WikiArticle"));
  await prisma.$executeRawUnsafe(attempt.buildSql("Post"));
}

async function ensureBm25Engine(): Promise<SearchEngine> {
  const existingIndexesReady = await hasRequiredBm25Indexes();
  if (existingIndexesReady && await verifyBm25Query()) {
    console.log("[ai-search] ParadeDB BM25 engine ready (existing)");
    return "bm25";
  }

  if (existingIndexesReady) {
    console.log("[ai-search] Existing BM25 indexes are invalid, recreating");
  }

  // 只有索引缺失或校验失败时才删除并重建，避免每次探测都触发重建。
  await dropBm25Indexes();

  for (const attempt of BM25_ATTEMPTS) {
    try {
      await createBm25Indexes(attempt);
      if (await verifyBm25Query()) {
        console.log("[ai-search] ParadeDB BM25 engine ready (" + attempt.name + ")");
        return "bm25";
      }
    } catch {
      // 当前 tokenizer 或语法不可用，继续尝试下一种配置。
    }

    // 每次失败后先清掉半成品索引，避免 IF NOT EXISTS 阻止后续尝试。
    await dropBm25Indexes();
  }

  return "ilike";
}

async function detectEngine(): Promise<SearchEngine> {
  if (_engine && _engine !== "probing") return _engine;
  if (_engineInitPromise) return _engineInitPromise;

  _engineInitPromise = (async () => {
    try {
      const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
        "SELECT count(*)::bigint AS cnt FROM pg_extension WHERE extname = 'pg_search'",
      );
      if (Number(rows[0]?.cnt ?? 0) === 0) {
        _engine = "ilike";
        return "ilike";
      }

      const engine = await ensureBm25Engine();
      _engine = engine;
      return engine;
    } catch (err) {
      console.log("[ai-search] BM25 not available, fallback to ILIKE:", (err as Error)?.message);
      _engine = "ilike";
      return "ilike";
    } finally {
      _engineInitPromise = null;
    }
  })();

  return _engineInitPromise;
}

// ── BM25 search ─────────────────────────────────────────────────

function sanitizeBm25Query(text: string): string {
  // Remove characters that have special meaning in ParadeDB's BM25 query syntax
  return text.replace(/[()+<>@"'\\]/g, " ").replace(/\s+/g, " ").trim();
}

async function searchWikiArticlesBM25(
  userId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const cleaned = sanitizeBm25Query(query);
  if (!cleaned) return [];

  const collabRows = await prisma.wikiCollaborator.findMany({
    where: { userId },
    select: { articleId: true },
  });
  const collabIds = collabRows.map((r) => r.articleId);
  const collabParam = collabIds.length > 0 ? collabIds : [""];

  const docs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id, title, content
     FROM "WikiArticle"
     WHERE "WikiArticle" @@@ $2
       AND ("userId"::text = $1 OR id::text = ANY($3::text[]))
     LIMIT $4`,
    userId,
    cleaned,
    collabParam,
    limit,
  );

  return docs.map((row, i: number) => {
    const id = getRowString(row, "id");
    const title = getRowString(row, "title");
    const content = getRowString(row, "content");
    return {
      id,
      title,
      snippet: content.length > SNIPPET_MAX_LEN ? content.slice(0, SNIPPET_MAX_LEN) + "..." : content,
      type: "wiki" as const,
      url: `/wiki/${id}`,
      score: docs.length - i,
    };
  });
}

async function searchForumPostsBM25(
  userId: string | undefined,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const cleaned = sanitizeBm25Query(query);
  if (!cleaned) return [];

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

  const docs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT "Post".id, "Post".title, "Post".content, b.id AS board_id, b.name AS board_name
     FROM "Post"
     JOIN "Board" b ON b.id = "Post"."boardId"
     WHERE "Post" @@@ $2
       AND "Post"."boardId"::text = ANY($1::text[])
     LIMIT $3`,
    boardIds,
    cleaned,
    limit,
  );

  return docs.map((row, i: number) => {
    const id = getRowString(row, "id");
    const title = getRowString(row, "title");
    const content = getRowString(row, "content");
    const boardId = getRowString(row, "board_id");
    return {
      id,
      title,
      snippet: content.length > SNIPPET_MAX_LEN ? content.slice(0, SNIPPET_MAX_LEN) + "..." : content,
      type: "post" as const,
      url: `/boards/${boardId || "unknown"}/posts/${id}`,
      score: docs.length - i,
    };
  });
}

// ── ILIKE fallback ──────────────────────────────────────────────

function isCJK(c: string): boolean {
  const code = c.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x2e80 && code <= 0x2eff) ||
    (code >= 0x3000 && code <= 0x303f)
  );
}

function extractKeywords(text: string): string[] {
  const cleaned = text.replace(/['\\]/g, " ");
  const segments = cleaned
    .split(/[\s,，。.！!？?、；;：:""''（）()【】\[\]{}]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  const keywords = new Set<string>();
  for (const seg of segments) {
    keywords.add(seg);
    if (seg.length > 1 && [...seg].some((c) => isCJK(c))) {
      const chars = [...seg];
      for (let len = Math.min(chars.length, 6); len >= 2; len--) {
        for (let start = 0; start + len <= chars.length; start++) {
          const sub = chars.slice(start, start + len).join("");
          if (sub !== seg) keywords.add(sub);
        }
      }
    }
  }
  return [...keywords];
}

function buildILIKEConditions(
  keywords: string[],
  paramStart: number,
): { conditions: string[]; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];
  for (const kw of keywords) {
    conditions.push(
      `(coalesce(title,'') || ' ' || coalesce(content,'')) ILIKE $${paramStart + params.length}`,
    );
    params.push(`%${kw}%`);
  }
  return { conditions, params };
}

async function searchWikiArticlesILIKE(
  userId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const collabRows = await prisma.wikiCollaborator.findMany({
    where: { userId },
    select: { articleId: true },
  });
  const collabIds = collabRows.map((r) => r.articleId);

  const kw = buildILIKEConditions(keywords, 4);
  const keywordConditions = kw.conditions.join(" OR ");
  const scoreExpr = keywords
    .map((_k, i) => `(CASE WHEN title ILIKE $${4 + i} THEN 3 ELSE 0 END) + (CASE WHEN content ILIKE $${4 + i} THEN 1 ELSE 0 END)`)
    .join(" + ");
  const params: unknown[] = [userId, collabIds.length > 0 ? collabIds : [""], limit, ...kw.params];

  const docs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id, title, content, (${scoreExpr}) AS score
     FROM "WikiArticle"
     WHERE ("userId"::text = $1 OR id::text = ANY($2))
       AND (${keywordConditions})
     ORDER BY score DESC
     LIMIT $3`,
    ...params,
  );

  return docs.map((row) => {
    const id = getRowString(row, "id");
    const title = getRowString(row, "title");
    const content = getRowString(row, "content");
    const score = Number(row.score) || 0;
    return {
      id,
      title,
      snippet: content.length > SNIPPET_MAX_LEN ? content.slice(0, SNIPPET_MAX_LEN) + "..." : content,
      type: "wiki" as const,
      url: `/wiki/${id}`,
      score,
    };
  });
}

async function searchForumPostsILIKE(
  userId: string | undefined,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

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

  const kw = buildILIKEConditions(keywords, 3);
  const keywordConditions = kw.conditions.join(" OR ");
  const scoreExpr = keywords
    .map((_k, i) => `(CASE WHEN p.title ILIKE $${3 + i} THEN 3 ELSE 0 END) + (CASE WHEN p.content ILIKE $${3 + i} THEN 1 ELSE 0 END)`)
    .join(" + ");
  const params: unknown[] = [boardIds, limit, ...kw.params];

  const docs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT p.id, p.title, p.content, b.id AS board_id, b.name AS board_name, (${scoreExpr}) AS score
     FROM "Post" p
     JOIN "Board" b ON b.id = p."boardId"
     WHERE p."boardId"::text = ANY($1)
       AND (${keywordConditions})
     ORDER BY score DESC
     LIMIT $2`,
    ...params,
  );

  return docs.map((row) => {
    const id = getRowString(row, "id");
    const title = getRowString(row, "title");
    const content = getRowString(row, "content");
    const boardId = getRowString(row, "board_id");
    const score = Number(row.score) || 0;
    return {
      id,
      title,
      snippet: content.length > SNIPPET_MAX_LEN ? content.slice(0, SNIPPET_MAX_LEN) + "..." : content,
      type: "post" as const,
      url: `/boards/${boardId || "unknown"}/posts/${id}`,
      score,
    };
  });
}

// ── Public API ───────────────────────────────────────────────────

export async function searchAllContent(
  userId: string | undefined,
  query: string,
  options?: { limit?: number },
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 10;
  const engine = await detectEngine();

  if (engine === "bm25") {
    // Try BM25 first. If no results, fall back to ILIKE.
    const [wikiBM25, postBM25] = await Promise.all([
      searchWikiArticlesBM25(userId || "", query, limit),
      searchForumPostsBM25(userId, query, limit),
    ]);
    const mergedBM25 = [...wikiBM25, ...postBM25]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    if (mergedBM25.length > 0) return mergedBM25;

    // BM25 returned 0 — retry with ILIKE
    console.log("[ai-search] BM25 returned 0, fallback to ILIKE");
  }

  const [wikiResults, postResults] = await Promise.all([
    searchWikiArticlesILIKE(userId || "", query, limit),
    searchForumPostsILIKE(userId, query, limit),
  ]);

  const merged = [...wikiResults, ...postResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return merged;
}

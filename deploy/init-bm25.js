// Create ParadeDB BM25 indexes after tables exist (prisma db push done).
// This runs on every container start; IF NOT EXISTS makes it idempotent.
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    // Extension may already exist from docker-entrypoint-initdb.d
    await prisma.$executeRawUnsafe(
      "CREATE EXTENSION IF NOT EXISTS pg_search",
    );

    // BM25 indexes (require tables to exist)
    // key_field must be the FIRST column in the index column list
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_wiki_article_bm25
       ON "WikiArticle" USING bm25 ("id", "title", "content")
       WITH (key_field = 'id')`,
    );

    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS idx_post_bm25
       ON "Post" USING bm25 ("id", "title", "content")
       WITH (key_field = 'id')`,
    );

    console.log("BM25 indexes ready");
  } catch (e) {
    // Non-ParadeDB databases (stock PostgreSQL) will fail here — that's fine.
    console.log("BM25 indexes skipped (not supported on this database)");
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuth();

  const collaborativeArticles = await prisma.wikiArticle.findMany({
    where: {
      collaborators: {
        some: { userId: user.id },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    collaborativeArticles.map((article) => ({
      id: article.id,
      title: article.title,
      owner: {
        id: article.user.id,
        name: article.user.name,
      },
    })),
  );
}

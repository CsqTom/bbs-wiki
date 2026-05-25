import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const excludeArticleId = searchParams.get("excludeArticleId");

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const excludeUserIds: string[] = [user.id];

  if (excludeArticleId) {
    const existingCollabs = await prisma.wikiCollaborator.findMany({
      where: { articleId: excludeArticleId },
      select: { userId: true },
    });
    existingCollabs.forEach((c) => excludeUserIds.push(c.userId));
  }

  const users = await prisma.user.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      id: { notIn: excludeUserIds },
    },
    select: { id: true, name: true, avatar: true },
    take: 20,
  });

  return NextResponse.json({ items: users });
}

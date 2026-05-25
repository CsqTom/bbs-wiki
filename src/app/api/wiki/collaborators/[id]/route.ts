import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  const { id } = await params;

  const collaborator = await prisma.wikiCollaborator.findUnique({
    where: { id },
    include: { article: { select: { userId: true } } },
  });

  if (!collaborator || collaborator.article.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.wikiCollaborator.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

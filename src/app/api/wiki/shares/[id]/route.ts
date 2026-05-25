import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  const { id } = await params;
  const { expiresInHours } = (await request.json()) as {
    expiresInHours?: number | null;
  };

  const shareLink = await prisma.wikiShareLink.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "分享链接不存在。" }, { status: 404 });
  }

  const expiresAt =
    typeof expiresInHours === "number" &&
    Number.isFinite(expiresInHours) &&
    expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

  const updated = await prisma.wikiShareLink.update({
    where: { id },
    data: { expiresAt },
  });

  return NextResponse.json({
    id: updated.id,
    expiresAt: updated.expiresAt?.toISOString() ?? null,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  const { id } = await params;

  const shareLink = await prisma.wikiShareLink.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "分享链接不存在。" }, { status: 404 });
  }

  await prisma.wikiShareLink.delete({
    where: {
      id: shareLink.id,
    },
  });

  return NextResponse.json({ success: true });
}

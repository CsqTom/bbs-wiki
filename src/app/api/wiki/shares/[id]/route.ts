import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

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

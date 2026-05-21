import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id: boardId } = await params;
  const { userId } = await request.json();

  const permission = await prisma.boardPermission.create({
    data: { boardId, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(permission);
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const { name, description } = await request.json();

  const board = await prisma.board.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });

  return NextResponse.json(board);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  await prisma.board.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

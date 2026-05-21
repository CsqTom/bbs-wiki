import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; permissionId: string }> },
) {
  await requireAdmin();
  const { permissionId } = await params;

  await prisma.boardPermission.delete({ where: { id: permissionId } });
  return NextResponse.json({ success: true });
}

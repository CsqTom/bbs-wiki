import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boards);
}

export async function POST(request: Request) {
  await requireAdmin();

  const { name, description, isPublic } = await request.json();

  const board = await prisma.board.create({
    data: { name, description, isPublic: isPublic || false },
  });

  return NextResponse.json(board);
}

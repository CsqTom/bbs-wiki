import { NextResponse } from "next/server";
import { requireAdmin, getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const boards = await prisma.board.findMany({
    where: isAdmin
      ? undefined // 管理员可以看到所有版块
      : {
          OR: [
            { isPublic: true },
            {
              boardPermissions: {
                some: {
                  userId: user?.id,
                },
              },
            },
          ],
        },
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

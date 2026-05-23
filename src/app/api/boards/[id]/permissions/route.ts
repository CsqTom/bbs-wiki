import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: boardId } = await params;
    const { userId, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "缺少用户信息" }, { status: 400 });
    }

    const [board, user] = await Promise.all([
      prisma.board.findUnique({ where: { id: boardId }, select: { id: true } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      }),
    ]);

    if (!board) {
      return NextResponse.json({ error: "版块不存在" }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const permission = await prisma.boardPermission.create({
      data: { boardId, userId, role: role || "MEMBER" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(permission);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "该用户已在当前版块中，无需重复添加" },
        { status: 409 },
      );
    }

    console.error("添加版块成员失败:", error);
    return NextResponse.json({ error: "添加成员失败" }, { status: 500 });
  }
}

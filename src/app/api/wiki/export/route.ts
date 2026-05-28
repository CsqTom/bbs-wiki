import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { createWikiBatchService } from "@/lib/wiki-batch";

interface ExportRequestBody {
  articleIds?: string[];
}

const wikiBatchService = createWikiBatchService({ prisma });

export async function POST(request: Request) {
  const user = await requireAuth();
  const body = (await request.json().catch(() => null)) as ExportRequestBody | null;

  const articleIds = Array.from(
    new Set((body?.articleIds ?? []).filter((id): id is string => Boolean(id))),
  );

  if (articleIds.length === 0) {
    return NextResponse.json(
      { error: "请至少选择一篇文章后再导出。" },
      { status: 400 },
    );
  }

  const items = await wikiBatchService.exportMarkdownFiles({
    userId: user.id,
    articleIds,
  });

  if (items.length === 0) {
    return NextResponse.json(
      { error: "未找到可导出的文章。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    count: items.length,
    items,
  });
}

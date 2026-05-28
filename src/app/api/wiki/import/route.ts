import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { createWikiBatchService } from "@/lib/wiki-batch";

interface ImportRequestBody {
  directoryId?: string | null;
  items?: Array<{
    fileName?: string;
    content?: string;
  }>;
}

function extractTitleFromFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\.md$/i, "");
  return normalized || "未命名文档";
}

const wikiBatchService = createWikiBatchService({ prisma });

export async function POST(request: Request) {
  const user = await requireAuth();
  const body = (await request.json().catch(() => null)) as ImportRequestBody | null;

  const directoryId =
    typeof body?.directoryId === "string" && body.directoryId.trim()
      ? body.directoryId
      : null;

  const items = (body?.items ?? [])
    .filter(
      (item): item is { fileName: string; content: string } =>
        typeof item?.fileName === "string" && typeof item?.content === "string",
    )
    .map((item) => ({
      fileName: item.fileName,
      title: extractTitleFromFileName(item.fileName),
      content: item.content,
      directoryId,
    }));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "请至少上传一个 Markdown 文件。" },
      { status: 400 },
    );
  }

  try {
    const result = await wikiBatchService.importMarkdownFiles({
      userId: user.id,
      items,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "批量导入失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}

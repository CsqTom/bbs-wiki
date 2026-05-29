import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { updateEditableWikiArticle } from "@/lib/wiki-article";

function decodeBase64Markdown(contentBase64: string) {
  try {
    return Buffer.from(contentBase64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const formData = await request.formData();
    const transport = String(formData.get("transport") ?? "");
    const contentBase64 = String(formData.get("contentBase64") ?? "");

    if (transport !== "base64-formdata-v1" || !contentBase64) {
      return NextResponse.json(
        { error: "缺少正文内容或传输协议不正确。" },
        { status: 400 },
      );
    }

    // 专用正文通道使用 Base64 包装正文，降低网关对命令文本的误判概率。
    const content = decodeBase64Markdown(contentBase64);
    if (content === null) {
      return NextResponse.json(
        { error: "正文解码失败，请刷新后重试。" },
        { status: 400 },
      );
    }

    const result = await updateEditableWikiArticle(
      { prisma },
      id,
      user.id,
      { content },
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason === "not_found" ? "文章不存在。" : "无编辑权限。" },
        { status: result.reason === "not_found" ? 404 : 403 },
      );
    }

    return NextResponse.json(result.article);
  } catch (error) {
    console.error("[wiki] 专用正文保存失败", error);
    return NextResponse.json(
      { error: "正文保存失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

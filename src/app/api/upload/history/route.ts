import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { listUploadedWikiImages } from "@/lib/upload";

export async function GET() {
  try {
    const user = await requireAuth();
    const items = await listUploadedWikiImages(user.id);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "读取历史图片失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

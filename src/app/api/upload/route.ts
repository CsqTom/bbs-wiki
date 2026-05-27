import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { uploadWikiImage, uploadAvatar } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "avatar" or "wiki"

    if (!file) {
      return NextResponse.json(
        { error: "未检测到上传文件" },
        { status: 400 },
      );
    }

    let url: string;
    if (type === "avatar") {
      url = await uploadAvatar(user.id, file);
    } else {
      url = await uploadWikiImage(user.id, file);
    }

    // 如果是头像上传，需要同步更新用户头像地址。
    if (type === "avatar") {
      const { prisma } = await import("@/lib/prisma");
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: url },
      });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[upload] 上传文件失败", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "图片上传失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}

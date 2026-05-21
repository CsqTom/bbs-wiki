import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { uploadWikiImage, uploadAvatar } from "@/lib/upload";

export async function POST(request: Request) {
  const user = await requireAuth();

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // "avatar" or "wiki"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let url: string;
  if (type === "avatar") {
    url = await uploadAvatar(user.id, file);
  } else {
    url = await uploadWikiImage(user.id, file);
  }

  // If avatar, update user record
  if (type === "avatar") {
    const { prisma } = await import("@/lib/prisma");
    await prisma.user.update({
      where: { id: user.id },
      data: { avatar: url },
    });
  }

  return NextResponse.json({ url });
}

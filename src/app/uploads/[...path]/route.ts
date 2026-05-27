import { readFile } from "fs/promises";
import { extname, join, resolve } from "path";
import { NextResponse } from "next/server";
import { UPLOAD_BASE } from "@/lib/upload";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
};

function isSafeUploadPath(pathParts: string[]) {
  if (pathParts.length < 3) {
    return false;
  }

  if (!["avatars", "wiki"].includes(pathParts[0])) {
    return false;
  }

  return pathParts.every(
    (part) =>
      Boolean(part) &&
      part !== "." &&
      part !== ".." &&
      !part.includes("/") &&
      !part.includes("\\"),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathParts } = await params;

  if (!isSafeUploadPath(pathParts)) {
    return NextResponse.json({ error: "无效的上传文件路径" }, { status: 400 });
  }

  const filePath = resolve(join(UPLOAD_BASE, ...pathParts));
  const uploadBasePath = resolve(UPLOAD_BASE);

  if (
    filePath !== uploadBasePath &&
    !filePath.startsWith(`${uploadBasePath}\\`) &&
    !filePath.startsWith(`${uploadBasePath}/`)
  ) {
    return NextResponse.json({ error: "无效的上传文件路径" }, { status: 400 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[upload] 读取上传文件失败", error);
    return NextResponse.json({ error: "上传文件不存在" }, { status: 404 });
  }
}

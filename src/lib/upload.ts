import { writeFile, mkdir, readdir, stat } from "fs/promises";
import { join, resolve } from "path";
import { v4 as uuidv4 } from "uuid";

export const UPLOAD_BASE = resolve(process.cwd(), "public", "uploads");

async function persistUploadedFile(
  userId: string,
  scope: "avatars" | "wiki",
  file: File,
): Promise<string> {
  const userDir = join(UPLOAD_BASE, scope, userId);

  try {
    await mkdir(userDir, { recursive: true });

    const ext = file.name.split(".").pop() || "png";
    const filename = `${uuidv4()}.${ext}`;
    const filepath = join(userDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return `/uploads/${scope}/${userId}/${filename}`;
  } catch (error) {
    console.error(`[upload] 保存${scope}图片失败`, error);
    throw new Error(
      "图片上传失败，服务器无法写入上传目录。若当前运行在容器内，请检查 public/uploads 是否已挂载且具备写权限。",
    );
  }
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  return persistUploadedFile(userId, "avatars", file);
}

export async function uploadWikiImage(
  userId: string,
  file: File,
): Promise<string> {
  return persistUploadedFile(userId, "wiki", file);
}

export interface UploadedWikiImageItem {
  name: string;
  url: string;
  updatedAt: string;
}

export async function listUploadedWikiImages(
  userId: string,
): Promise<UploadedWikiImageItem[]> {
  const userDir = join(UPLOAD_BASE, "wiki", userId);

  try {
    const fileNames = await readdir(userDir);
    const imageEntries = await Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = join(userDir, fileName);
        const fileStat = await stat(filePath);

        if (!fileStat.isFile()) {
          return null;
        }

        return {
          name: fileName,
          url: `/uploads/wiki/${userId}/${fileName}`,
          updatedAt: fileStat.mtime.toISOString(),
        };
      }),
    );

    return imageEntries
      .filter((item): item is UploadedWikiImageItem => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    console.error("[upload] 读取 Wiki 历史图片失败", error);
    throw new Error("读取历史图片失败，请稍后重试。");
  }
}

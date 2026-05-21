import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_BASE = join(process.cwd(), "public", "uploads");

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const userDir = join(UPLOAD_BASE, "avatars", userId);
  await mkdir(userDir, { recursive: true });

  const ext = file.name.split(".").pop() || "png";
  const filename = `${uuidv4()}.${ext}`;
  const filepath = join(userDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return `/uploads/avatars/${userId}/${filename}`;
}

export async function uploadWikiImage(
  userId: string,
  file: File,
): Promise<string> {
  const userDir = join(UPLOAD_BASE, "wiki", userId);
  await mkdir(userDir, { recursive: true });

  const ext = file.name.split(".").pop() || "png";
  const filename = `${uuidv4()}.${ext}`;
  const filepath = join(userDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return `/uploads/wiki/${userId}/${filename}`;
}

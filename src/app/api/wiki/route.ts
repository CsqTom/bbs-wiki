import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export async function POST(request: Request) {
  const user = await requireAuth();

  const { type, name, title, parentId, directoryId } = await request.json();

  if (type === "directory") {
    const slug = slugify(name);
    const directory = await prisma.wikiDirectory.create({
      data: {
        name,
        slug,
        userId: user.id,
        parentId: parentId || null,
      },
    });
    return NextResponse.json(directory);
  }

  if (type === "article") {
    const slug = slugify(title);
    const article = await prisma.wikiArticle.create({
      data: {
        title,
        slug,
        content: "",
        userId: user.id,
        directoryId: directoryId || null,
      },
    });
    return NextResponse.json(article);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

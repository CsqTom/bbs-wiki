import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeForumResourceHref } from "@/lib/forum-resource";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get("path") ?? "";
    const resourcePath = normalizeForumResourceHref(rawPath);

    if (!resourcePath) {
      return NextResponse.json({ error: "无效的论坛资源链接" }, { status: 400 });
    }

    if (resourcePath.startsWith("/wiki/")) {
      const slugPath = resourcePath.replace("/wiki/", "").split("/");
      const targetSlug = slugPath[slugPath.length - 1];

      if (!targetSlug) {
        return NextResponse.json(
          {
            kind: "article",
            title: "目录或未找到",
            content: "该链接指向一个目录或未找到对应文章内容。",
          },
        );
      }

      const article = await prisma.wikiArticle.findFirst({
        where: { slug: targetSlug },
      });

      if (!article) {
        return NextResponse.json(
          {
            kind: "article",
            title: "目录或未找到",
            content: "该链接指向一个目录或未找到对应文章内容。",
          },
        );
      }

      return NextResponse.json({
        kind: "article",
        title: article.title,
        content: article.content,
      });
    }

    if (resourcePath.startsWith("/share/")) {
      const token = resourcePath.replace("/share/", "").split("/")[0].split("?")[0];
      const shareLink = await prisma.wikiShareLink.findUnique({
        where: { token },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              article: {
                select: {
                  id: true,
                  title: true,
                  content: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      });

      if (!shareLink) {
        return NextResponse.json({
          kind: "article",
          title: "分享未找到",
          content: "该分享链接不存在，或已被删除。",
        });
      }

      return NextResponse.json({
        kind: "share",
        title: shareLink.title ?? "Wiki 分享",
        articles: shareLink.items.map(({ article }) => ({
          id: article.id,
          title: article.title,
          content: article.content,
          updatedAt: article.updatedAt.toISOString(),
        })),
      });
    }

    return NextResponse.json({ error: "暂不支持的论坛资源类型" }, { status: 400 });
  } catch (error) {
    console.error("解析论坛资源预览失败:", error);
    return NextResponse.json({ error: "预览加载失败" }, { status: 500 });
  }
}

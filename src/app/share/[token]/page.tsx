import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShareContentViewer } from "./ShareContentViewer";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const shareLink = await prisma.wikiShareLink.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      items: {
        orderBy: {
          sortOrder: "asc",
        },
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
    notFound();
  }

  const activeShareRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "WikiShareLink"
    WHERE id = ${shareLink.id}
      AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    LIMIT 1
  `;

  const isExpired =
    shareLink.expiresAt !== null && activeShareRows.length === 0;

  if (isExpired) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-16">
        <div className="w-full rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="mt-3 text-3xl font-semibold text-gray-900">
            该分享链接已过期
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            分享者已为该链接设置过期时间，当前已无法继续查看内容。
          </p>
          <p className="mt-4 text-xs text-gray-500">
            过期时间：{shareLink.expiresAt ? formatDate(shareLink.expiresAt) : "-"}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {shareLink.items.length > 1 && (
        <nav className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900">目录</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shareLink.items.map(({ article }) => (
              <a
                key={article.id}
                href={`#article-${article.id}`}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700"
              >
                {article.title}
              </a>
            ))}
          </div>
        </nav>
      )}

      <ShareContentViewer
        title={shareLink.title ?? "未命名分享"}
        ownerName={shareLink.user.name}
        articleCount={shareLink.items.length}
        expiresLabel={
          shareLink.expiresAt
            ? `过期时间：${formatDate(shareLink.expiresAt)}`
            : "过期时间：永久有效"
        }
        articles={shareLink.items.map(({ article }) => ({
          id: article.id,
          title: article.title,
          content: article.content,
          updatedAt: article.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

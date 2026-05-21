import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { WikiArticleEditor } from "../WikiArticleEditor";

export default async function WikiPathPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const userId = user.id;

  const { path } = await params;
  const directories = await prisma.wikiDirectory.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
    orderBy: { name: "asc" },
  });

  function resolveDirectoryChain(slugs: string[]) {
    const resolved: typeof directories = [];
    let parentId: string | null = null;

    for (const slug of slugs) {
      const directory = directories.find(
        (item) => item.parentId === parentId && item.slug === slug,
      );
      if (!directory) return null;
      resolved.push(directory);
      parentId = directory.id;
    }

    return resolved;
  }

  async function renderArticle(directoryId: string | null, slug: string) {
    const article = await prisma.wikiArticle.findFirst({
      where: {
        userId,
        directoryId,
        slug,
      },
    });
    if (!article) notFound();

    return (
      <div className="h-full">
        <WikiArticleEditor
          article={{
            id: article.id,
            title: article.title,
            content: article.content,
            slug: article.slug,
            directoryId: article.directoryId,
            updatedAt: article.updatedAt.toISOString(),
          }}
        />
      </div>
    );
  }

  const matchedDirectoryChain = resolveDirectoryChain(path);
  if (matchedDirectoryChain && matchedDirectoryChain.length > 0) {
    const currentDirectory =
      matchedDirectoryChain[matchedDirectoryChain.length - 1];
    const articles = await prisma.wikiArticle.findMany({
      where: { userId, directoryId: currentDirectory.id },
      orderBy: { title: "asc" },
    });

    return (
      <div className="flex h-full min-h-[620px] flex-col rounded-2xl border border-gray-200 bg-white p-6">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-sm text-blue-600">
            {matchedDirectoryChain.map((directory) => directory.name).join(" / ")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            {currentDirectory.name}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            从左侧继续选择文章，或在当前目录下新建内容。
          </p>
        </div>

        <div className="mt-6 flex-1">
          {articles.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <p className="text-sm text-gray-500">当前目录下还没有文章。</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/wiki/${[...path, article.slug].join("/")}`}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="text-base font-medium text-gray-900">
                    {article.title}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">点击后在右侧打开文章</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (path.length === 1) {
    return renderArticle(null, path[0]);
  }

  const parentDirectoryChain = resolveDirectoryChain(path.slice(0, -1));
  if (parentDirectoryChain && parentDirectoryChain.length > 0) {
    const parentDirectory = parentDirectoryChain[parentDirectoryChain.length - 1];
    return renderArticle(parentDirectory.id, path[path.length - 1]);
  }

  notFound();
}

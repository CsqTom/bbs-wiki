import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export default async function WikiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [rootArticle, rootDirectory] = await Promise.all([
    prisma.wikiArticle.findFirst({
      where: {
        userId: user.id,
        directoryId: null,
      },
      orderBy: { title: "asc" },
      select: { slug: true },
    }),
    prisma.wikiDirectory.findFirst({
      where: {
        userId: user.id,
        parentId: null,
      },
      orderBy: { name: "asc" },
      select: { slug: true },
    }),
  ]);

  if (rootArticle) {
    redirect(`/wiki/${rootArticle.slug}`);
  }

  if (rootDirectory) {
    redirect(`/wiki/${rootDirectory.slug}`);
  }

  return (
    <div className="flex h-full min-h-[620px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white">
      <div className="max-w-lg text-center">
        <h2 className="text-2xl font-semibold text-gray-900">选择左侧文章开始编辑</h2>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          现在 `My Wiki` 已切换为常见的知识库工作台布局：
          左侧集中管理目录和文章，右侧直接打开内容，减少来回跳转。
        </p>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { WikiSidebar } from "./WikiSidebar";

export default async function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const directories = await prisma.wikiDirectory.findMany({
    where: { userId: user.id },
    include: {
      wikiArticles: {
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const rootArticles = await prisma.wikiArticle.findMany({
    where: { userId: user.id, directoryId: null },
    orderBy: { title: "asc" },
  });

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[720px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <WikiSidebar
        directories={directories.map((directory) => ({
          id: directory.id,
          name: directory.name,
          slug: directory.slug,
          parentId: directory.parentId,
          wikiArticles: directory.wikiArticles.map((article) => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            directoryId: article.directoryId,
          })),
        }))}
        rootArticles={rootArticles.map((article) => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          directoryId: article.directoryId,
        }))}
      />

      <section className="min-w-0 flex-1 bg-gray-50">
        <div className="h-full min-h-0 overflow-auto p-4 md:p-6">{children}</div>
      </section>
    </div>
  );
}

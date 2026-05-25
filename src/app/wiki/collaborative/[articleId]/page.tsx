import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { WikiArticleEditor } from "../../WikiArticleEditor";

export default async function CollaborativeArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { articleId } = await params;

  const article = await prisma.wikiArticle.findUnique({
    where: { id: articleId },
    include: {
      collaborators: {
        where: { userId: user.id },
        select: { id: true },
      },
    },
  });

  if (!article) notFound();

  const isOwner = article.userId === user.id;
  const isCollaborator = article.collaborators.length > 0;

  if (!isOwner && !isCollaborator) {
    notFound();
  }

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
        isCollaborative={!isOwner}
        isOwner={isOwner}
      />
    </div>
  );
}

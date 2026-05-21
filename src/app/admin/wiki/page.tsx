import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export default async function AdminWikiPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    include: {
      wikiDirectories: { include: { wikiArticles: true } },
      wikiArticles: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Wiki Overview</h1>
      <div className="space-y-4">
        {users.map((u: typeof users[number]) => (
          <div key={u.id} className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-lg mb-2">
              {u.name} ({u.email})
            </h2>
            <div className="ml-4 space-y-1 text-sm">
              <p>Directories: {u.wikiDirectories.length}</p>
              <p>
                Articles:{" "}
                {u.wikiDirectories.reduce(
                  (sum, d) => sum + d.wikiArticles.length,
                  u.wikiArticles.filter((a) => !a.directoryId).length,
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

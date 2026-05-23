import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const publicBoards = await prisma.board.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome to BBS-Wiki</h1>

      <section>
        <h2 className="text-xl font-semibold mb-4">Public Boards/公开版块</h2>
        {publicBoards.length === 0 ? (
          <p className="text-gray-500">No public boards yet.</p>
        ) : (
          <div className="grid gap-4">
            {publicBoards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition"
              >
                <h3 className="text-lg font-medium">{board.name}</h3>
                {board.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {board.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

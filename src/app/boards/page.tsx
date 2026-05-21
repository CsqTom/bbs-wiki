import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

export default async function BoardsPage() {
  const user = await getCurrentUser();

  const publicBoards = await prisma.board.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
  });

  let privateBoards: typeof publicBoards = [];
  if (user) {
    privateBoards = await prisma.board.findMany({
      where: {
        isPublic: false,
        boardPermissions: { some: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // If admin, show all boards
  let allBoards: typeof publicBoards = [];
  if (user?.role === "ADMIN") {
    const permittedBoards = await prisma.board.findMany({
      where: { isPublic: false },
      orderBy: { createdAt: "desc" },
    });
    allBoards = permittedBoards.filter(
      (b) => !privateBoards.find((pb) => pb.id === b.id),
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Boards</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">Public Boards</h2>
          {publicBoards.length === 0 ? (
            <p className="text-gray-500">No public boards.</p>
          ) : (
            <div className="grid gap-3">
              {publicBoards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="block p-4 bg-white rounded-lg shadow hover:shadow-md"
                >
                  <h3 className="font-medium">{board.name}</h3>
                  {board.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {board.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {user && privateBoards.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              My Private Boards
            </h2>
            <div className="grid gap-3">
              {privateBoards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="block p-4 bg-white rounded-lg shadow hover:shadow-md"
                >
                  <h3 className="font-medium">{board.name}</h3>
                  {board.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {board.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

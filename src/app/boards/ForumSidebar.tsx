"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BoardInfo {
  id: string;
  name: string;
  description: string | null;
}

interface ForumSidebarProps {
  publicBoards: BoardInfo[];
  privateBoards: BoardInfo[];
  className?: string;
  onNavigate?: () => void;
}

export function ForumSidebar({
  publicBoards,
  privateBoards,
  className = "",
  onNavigate,
}: ForumSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`flex h-full min-w-0 flex-col bg-white ${className}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            公开版块
          </h3>
          <div className="space-y-1">
            {publicBoards.map((board) => {
              const isActive = pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`);
              return (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  onClick={onNavigate}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="truncate">{board.name}</div>
                </Link>
              );
            })}
            {publicBoards.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">暂无公开版块</div>
            )}
          </div>
        </div>

        {privateBoards.length > 0 && (
          <div>
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              内部版块
            </h3>
            <div className="space-y-1">
              {privateBoards.map((board) => {
                const isActive = pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`);
                return (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    onClick={onNavigate}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="truncate">{board.name}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

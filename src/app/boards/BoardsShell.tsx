"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ForumSidebar } from "./ForumSidebar";

interface BoardInfo {
  id: string;
  name: string;
  description: string | null;
}

interface BoardsShellProps {
  publicBoards: BoardInfo[];
  privateBoards: BoardInfo[];
  children: React.ReactNode;
}

export function BoardsShell({
  publicBoards,
  privateBoards,
  children,
}: BoardsShellProps) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isPostDetailPage = useMemo(
    () => /^\/boards\/[^/]+\/posts\/[^/]+/.test(pathname),
    [pathname],
  );

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div
      className={`relative flex rounded-2xl border border-gray-200 bg-white shadow-sm ${
        isPostDetailPage
          ? "h-auto min-h-0 overflow-y-auto md:h-[calc(100vh-8.5rem)] md:min-h-[720px] md:overflow-hidden"
          : "h-[calc(100vh-8.5rem)] min-h-0 overflow-hidden md:min-h-[720px]"
      }`}
    >
      {!isPostDetailPage && (
        <>
          <div className="hidden w-64 shrink-0 border-r border-gray-200 md:flex">
            <ForumSidebar
              publicBoards={publicBoards}
              privateBoards={privateBoards}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="absolute left-0 top-6 z-20 rounded-r-lg border border-l-0 border-gray-200 bg-white px-2 py-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 md:hidden"
          >
            版块
          </button>

          {isMobileSidebarOpen && (
            <>
              <button
                type="button"
                aria-label="关闭版块侧栏"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute inset-0 z-30 bg-black/20 md:hidden"
              />

              <div className="absolute inset-y-0 left-0 z-40 w-72 max-w-[82vw] md:hidden">
                <div className="flex h-full flex-col overflow-hidden border-r border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">论坛版块</h2>
                      <p className="mt-1 text-xs text-gray-500">选择版块后会自动收起</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      关闭
                    </button>
                  </div>

                  <ForumSidebar
                    publicBoards={publicBoards}
                    privateBoards={privateBoards}
                    className="w-full"
                    onNavigate={() => setIsMobileSidebarOpen(false)}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      <section
        className={`min-w-0 flex-1 bg-gray-50 flex flex-col ${
          isPostDetailPage ? "overflow-visible" : ""
        }`}
      >
        {children}
      </section>
    </div>
  );
}

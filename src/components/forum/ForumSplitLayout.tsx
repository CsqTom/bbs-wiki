"use client";

import { ReactNode } from "react";

interface ForumSplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  isRightOpen: boolean;
}

export function ForumSplitLayout({
  leftPanel,
  rightPanel,
  isRightOpen,
}: ForumSplitLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[720px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* 左侧面板 */}
      <div
        className={`h-full min-h-0 overflow-y-auto transition-all duration-300 ease-in-out ${
          isRightOpen ? "w-1/2 border-r border-gray-200" : "w-full"
        }`}
      >
        <div className="p-4 md:p-6">{leftPanel}</div>
      </div>

      {/* 右侧面板 */}
      <div
        className={`h-full min-h-0 bg-gray-50 transition-all duration-300 ease-in-out ${
          isRightOpen
            ? "w-1/2 opacity-100 overflow-y-auto"
            : "w-0 opacity-0 overflow-hidden border-none"
        }`}
      >
        <div className="min-w-[300px] h-full">{rightPanel}</div>
      </div>
    </div>
  );
}

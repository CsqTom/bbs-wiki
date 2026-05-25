"use client";

import { ReactNode } from "react";

interface ForumSplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  isRightOpen: boolean;
  mobileStackOrder?: "left-first" | "right-first";
  mobileLayout?: "split" | "page-stack";
}

export function ForumSplitLayout({
  leftPanel,
  rightPanel,
  isRightOpen,
  mobileStackOrder = "left-first",
  mobileLayout = "split",
}: ForumSplitLayoutProps) {
  const isRightFirstOnMobile = mobileStackOrder === "right-first";
  const isPageStackOnMobile = mobileLayout === "page-stack" && isRightOpen;

  return (
    <div
      className={`flex min-h-0 w-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm md:h-[calc(100vh-8.5rem)] md:min-h-[720px] md:flex-row md:overflow-hidden ${
        isPageStackOnMobile ? "h-auto overflow-visible" : "h-[calc(100vh-8.5rem)] overflow-hidden"
      }`}
    >
      {/* 左侧面板 */}
      <div
        className={`min-h-0 transition-all duration-300 ease-in-out ${
          isRightOpen
            ? isPageStackOnMobile
              ? `w-full overflow-visible ${
                  isRightFirstOnMobile
                    ? "order-2 border-t border-gray-200"
                    : "order-1"
                } md:w-1/2 md:overflow-y-auto md:border-r md:border-t-0 md:border-gray-200 md:order-1`
              : `w-full overflow-y-auto md:w-1/2 ${
                  isRightFirstOnMobile
                    ? "order-2 border-t border-gray-200 md:order-1 md:border-t-0 md:border-r md:border-gray-200"
                    : "order-1 md:border-r md:border-gray-200"
                }`
            : "w-full overflow-y-auto"
        }`}
      >
        <div className="p-4 md:p-6">{leftPanel}</div>
      </div>

      {/* 右侧面板 */}
      <div
        className={`min-h-0 bg-gray-50 transition-all duration-300 ease-in-out ${
          isRightOpen
            ? isPageStackOnMobile
              ? `w-full shrink-0 opacity-100 overflow-visible ${
                  isRightFirstOnMobile
                    ? "order-1"
                    : "order-2 border-t border-gray-200"
                } md:w-1/2 md:overflow-y-auto md:order-2 md:border-l md:border-t-0 md:border-gray-200`
              : `w-full shrink-0 opacity-100 overflow-y-auto md:w-1/2 ${
                  isRightFirstOnMobile
                    ? "order-1 max-h-[40vh] md:order-2 md:max-h-none"
                    : "order-2 max-h-[40vh] border-t border-gray-200 md:order-2 md:max-h-none md:border-l md:border-t-0 md:border-gray-200"
                }`
            : "w-0 opacity-0 overflow-hidden border-none"
        }`}
      >
        <div className="h-full min-w-0 md:min-w-[300px]">{rightPanel}</div>
      </div>
    </div>
  );
}

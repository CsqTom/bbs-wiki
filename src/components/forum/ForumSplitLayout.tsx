"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface ForumSplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  isRightOpen: boolean;
  mobileStackOrder?: "left-first" | "right-first";
  mobileLayout?: "split" | "page-stack";
}

const MIN_LEFT_PCT = 25;
const MAX_LEFT_PCT = 75;

export function ForumSplitLayout({
  leftPanel,
  rightPanel,
  isRightOpen,
  mobileStackOrder = "left-first",
  mobileLayout = "split",
}: ForumSplitLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(38);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isRightFirstOnMobile = mobileStackOrder === "right-first";
  const isPageStackOnMobile = mobileLayout === "page-stack" && isRightOpen;
  const showResizeHandle = isRightOpen && isDesktop;

  const stopDragging = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, pct));
      setLeftWidth(pct);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [isDragging, stopDragging]);

  // 关闭右面板时复位左侧宽度
  useEffect(() => {
    if (!isRightOpen) setLeftWidth(38);
  }, [isRightOpen]);

  const transitionClass = isDragging ? "" : "transition-all duration-300 ease-in-out";

  return (
    <div
      ref={containerRef}
      className={`flex min-h-0 w-full rounded-2xl border border-gray-200 bg-white shadow-sm md:h-[calc(100vh-8.5rem)] md:min-h-[720px] md:flex-row md:overflow-hidden ${
        isRightOpen
          ? `${isRightFirstOnMobile ? "flex-col-reverse" : "flex-col"} ${
              isPageStackOnMobile ? "h-auto overflow-visible" : "h-[calc(100vh-8.5rem)] overflow-hidden"
            }`
          : "flex-col h-[calc(100vh-8.5rem)] overflow-hidden"
      }`}
    >
      {/* 左侧面板 */}
      <div
        className={`min-h-0 overflow-y-auto ${transitionClass} ${
          isRightOpen
            ? isPageStackOnMobile
              ? "w-full overflow-visible md:overflow-y-auto md:border-r md:border-t-0 md:border-gray-200"
              : "w-full md:border-r md:border-gray-200"
            : "w-full"
        }`}
        style={showResizeHandle ? { width: `${leftWidth}%` } : undefined}
      >
        <div className="p-4 md:p-6">{leftPanel}</div>
      </div>

      {/* 可拖拽分隔条 — 仅在桌面端右侧打开时显示 */}
      {showResizeHandle && (
        <button
          type="button"
          aria-label="调整左右比例"
          onMouseDown={() => setIsDragging(true)}
          className="flex w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-gray-200 bg-gray-100 hover:bg-blue-50 transition-colors"
        >
          <span className="h-16 w-0.5 rounded-full bg-gray-300 group-hover:bg-blue-400" />
        </button>
      )}

      {/* 右侧面板 */}
      <div
        className={`min-h-0 bg-gray-50 overflow-y-auto ${transitionClass} ${
          isRightOpen
            ? isPageStackOnMobile
              ? "w-full shrink-0 opacity-100 overflow-visible md:overflow-y-auto md:border-l md:border-t-0 md:border-gray-200"
              : `w-full shrink-0 opacity-100 ${
                  isRightFirstOnMobile
                    ? "max-h-[40vh] md:max-h-none"
                    : "max-h-[40vh] border-t border-gray-200 md:max-h-none md:border-l md:border-t-0 md:border-gray-200"
                }`
            : "w-0 opacity-0 overflow-hidden border-none"
        } ${showResizeHandle ? "md:flex-1" : ""}`}
      >
        <div className="h-full min-w-0 md:min-w-[300px]">{rightPanel}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

interface HistoryImageItem {
  name: string;
  url: string;
  updatedAt: string;
}

interface HistoryImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(updatedAt));
}

export function HistoryImageDialog({
  isOpen,
  onClose,
  onSelect,
}: HistoryImageDialogProps) {
  const [items, setItems] = useState<HistoryImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadHistoryImages() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch("/api/upload/history");
        const data = (await res.json().catch(() => null)) as
          | { items?: HistoryImageItem[]; error?: string }
          | null;

        if (!res.ok) {
          throw new Error(data?.error ?? "读取历史图片失败，请稍后重试。");
        }

        if (cancelled) return;
        const nextItems = data?.items ?? [];
        setItems(nextItems);
        setSelectedUrl(nextItems[0]?.url ?? "");
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "读取历史图片失败，请稍后重试。",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistoryImages();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const selectedItem = useMemo(
    () => items.find((item) => item.url === selectedUrl) ?? null,
    [items, selectedUrl],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">历史图片</h3>
            <p className="mt-1 text-sm text-gray-500">
              选择已上传过的图片，插入到当前 Markdown 编辑器。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-0 overflow-auto p-5">
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
                正在加载历史图片...
              </div>
            ) : error ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-red-600">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
                暂无历史图片，请先上传至少一张本地图片。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {items.map((item) => {
                  const isSelected = item.url === selectedUrl;

                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => setSelectedUrl(item.url)}
                      className={`overflow-hidden rounded-xl border text-left transition ${
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-100"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 px-3 py-3">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatUpdatedAt(item.updatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="border-t border-gray-200 bg-gray-50 p-5 md:border-l md:border-t-0">
            <h4 className="text-sm font-semibold text-gray-900">图片预览</h4>
            {selectedItem ? (
              <>
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.name}
                    className="h-56 w-full object-contain bg-gray-50"
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="break-all font-medium text-gray-900">
                    {selectedItem.name}
                  </p>
                  <p className="text-gray-500">
                    上传时间：{formatUpdatedAt(selectedItem.updatedAt)}
                  </p>
                  <p className="break-all text-xs text-gray-400">
                    {selectedItem.url}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
                请选择一张图片进行预览。
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selectedItem}
                onClick={() => {
                  if (!selectedItem) return;
                  onSelect(selectedItem.url);
                  onClose();
                }}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                插入图片
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

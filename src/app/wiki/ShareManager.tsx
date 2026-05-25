"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  copyShareUrl,
  createWikiShareLink,
  deleteWikiShareLink,
  updateShareExpiry,
  type WikiShareListItem,
} from "./share-client";
import {
  buildDirectoryTree,
  type DirectoryNode,
  type WikiTreeArticle,
  type WikiTreeDirectory,
} from "./wiki-tree";

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "永久有效";

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

function formatRemainingDays(expiresAt: string | null) {
  if (!expiresAt) return "永久";

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diffMs = expiry - now;

  if (diffMs <= 0) return "已过期";

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 365) {
    const years = Math.floor(diffDays / 365);
    return `剩余 ${years} 年`;
  }
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    return `剩余 ${months} 个月`;
  }
  return `剩余 ${diffDays} 天`;
}

function buildShareObjectLabel(share: {
  title: string | null;
  articleTitles: string[];
  articleCount: number;
}) {
  if (share.title) return share.title;
  if (share.articleTitles.length === 0) return "未命名分享";
  if (share.articleTitles.length === 1) return share.articleTitles[0];

  return `${share.articleTitles[0]} 等 ${share.articleCount} 篇文章`;
}

function normalizeShareUrl(shareUrl: string) {
  if (shareUrl.startsWith("http://") || shareUrl.startsWith("https://")) {
    return shareUrl;
  }

  if (typeof window === "undefined") {
    return shareUrl;
  }

  return `${window.location.origin}${shareUrl}`;
}

function ShareTreeNode({
  node,
  expandedIds,
  onToggle,
  selectedArticleIds,
  onToggleArticleSelection,
}: {
  node: DirectoryNode;
  expandedIds: Set<string>;
  onToggle: (directoryId: string) => void;
  selectedArticleIds: Set<string>;
  onToggleArticleSelection: (articleId: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100">
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200"
          aria-label={isExpanded ? "收起目录" : "展开目录"}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
          {node.name}
        </span>
      </div>

      {isExpanded && (
        <div className="ml-5 space-y-1 border-l border-gray-200 pl-3">
          {node.articleLinks.map((article) => (
            <label
              key={article.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={selectedArticleIds.has(article.id)}
                onChange={() => onToggleArticleSelection(article.id)}
                className="h-4 w-4 rounded border-gray-300 text-violet-600"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                {article.title}
              </span>
            </label>
          ))}

          {node.children.map((child) => (
            <ShareTreeNode
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
              selectedArticleIds={selectedArticleIds}
              onToggleArticleSelection={onToggleArticleSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ShareManager({
  directories,
  rootArticles,
  shareLinks: initialShareLinks,
  initialSelectedArticleIds = [],
}: {
  directories: WikiTreeDirectory[];
  rootArticles: WikiTreeArticle[];
  shareLinks: WikiShareListItem[];
  initialSelectedArticleIds?: string[];
}) {
  const [shareLinks, setShareLinks] = useState(initialShareLinks);
  const [selectedArticleIds, setSelectedArticleIds] = useState(
    initialSelectedArticleIds,
  );
  const [shareExpiresHours, setShareExpiresHours] = useState("24");
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null);
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [updatingExpiryId, setUpdatingExpiryId] = useState<string | null>(null);
  const expiryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editingExpiryId) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        expiryDropdownRef.current &&
        !expiryDropdownRef.current.contains(e.target as Node)
      ) {
        setEditingExpiryId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingExpiryId]);
  const tree = useMemo(() => buildDirectoryTree(directories), [directories]);
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(directories.map((directory) => directory.id)),
  );
  const selectedArticleIdSet = useMemo(
    () => new Set(selectedArticleIds),
    [selectedArticleIds],
  );

  function toggleDirectory(directoryId: string) {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(directoryId)) {
        next.delete(directoryId);
      } else {
        next.add(directoryId);
      }
      return next;
    });
  }

  function toggleArticleSelection(articleId: string) {
    setSelectedArticleIds((previous) =>
      previous.includes(articleId)
        ? previous.filter((id) => id !== articleId)
        : [...previous, articleId],
    );
  }

  async function handleCreateShareLink() {
    if (selectedArticleIds.length === 0) {
      window.alert("请先在左侧选择至少一篇文章。");
      return;
    }

    setGeneratingShareLink(true);

    try {
      const result = await createWikiShareLink({
        articleIds: selectedArticleIds,
        expiresInHours:
          shareExpiresHours === "never" ? null : Number(shareExpiresHours),
      });

      setShareLinks((previous) => [
        {
          id: result.id,
          token: result.token,
          title: result.title,
          expiresAt: result.expiresAt,
          createdAt: new Date().toISOString(),
          articleCount: result.articleCount,
          articleTitles: result.articleTitles,
          shareUrl: result.shareUrl,
        },
        ...previous,
      ]);

      try {
        await copyShareUrl(result.shareUrl);
      } catch {}
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "生成分享链接失败，请稍后重试。",
      );
    } finally {
      setGeneratingShareLink(false);
    }
  }

  async function handleCopyShareLink(shareUrl: string) {
    try {
      await copyShareUrl(normalizeShareUrl(shareUrl));
    } catch {
      window.alert("复制失败，请手动复制链接。");
    }
  }

  async function handleUpdateExpiry(
    share: WikiShareListItem,
    expiresInHours: number | null,
  ) {
    setUpdatingExpiryId(share.id);

    try {
      const result = await updateShareExpiry(share.id, expiresInHours);
      setShareLinks((previous) =>
        previous.map((item) =>
          item.id === share.id
            ? { ...item, expiresAt: result?.expiresAt ?? null }
            : item,
        ),
      );
      setEditingExpiryId(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "更新过期时间失败，请稍后重试。",
      );
    } finally {
      setUpdatingExpiryId(null);
    }
  }

  async function handleDeleteShareLink(share: WikiShareListItem) {
    const confirmed = window.confirm(
      `确定删除分享“${buildShareObjectLabel(share)}”吗？删除后外部链接将失效。`,
    );
    if (!confirmed) return;

    setDeletingShareId(share.id);

    try {
      await deleteWikiShareLink(share.id);
      setShareLinks((previous) =>
        previous.filter((item) => item.id !== share.id),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "删除分享链接失败，请稍后重试。",
      );
    } finally {
      setDeletingShareId(null);
    }
  }

  return (
    <div className="grid h-full min-h-[620px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <p className="text-sm font-medium text-violet-700">分享管理</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">
            新增分享链接
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            左侧选择要分享的文章，再设置有效期并生成链接。
          </p>
        </div>

        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">
              已选 {selectedArticleIds.length} 篇
            </span>
            <select
              value={shareExpiresHours}
              onChange={(event) => setShareExpiresHours(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="24">24 小时有效</option>
              <option value="72">3 天有效</option>
              <option value="168">7 天有效</option>
              <option value="720">30 天有效</option>
              <option value="never">永久有效</option>
            </select>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCreateShareLink}
              disabled={generatingShareLink}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {generatingShareLink ? "生成中..." : "生成分享链接"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedArticleIds([])}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              清空选择
            </button>
          </div>

        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          <div className="space-y-2">
            {rootArticles.map((article) => (
              <label
                key={article.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={selectedArticleIdSet.has(article.id)}
                  onChange={() => toggleArticleSelection(article.id)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {article.title}
                </span>
              </label>
            ))}
          </div>

          {tree.length > 0 && (
            <div className="mt-4 space-y-2">
              {tree.map((node) => (
                <ShareTreeNode
                  key={node.id}
                  node={node}
                  expandedIds={expandedIds}
                  onToggle={toggleDirectory}
                  selectedArticleIds={selectedArticleIdSet}
                  onToggleArticleSelection={toggleArticleSelection}
                />
              ))}
            </div>
          )}

          {rootArticles.length === 0 && tree.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              当前还没有可分享的文章，请先回到 Wiki 新建内容。
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-xl font-semibold text-gray-900">分享列表</h2>
          <p className="mt-2 text-sm text-gray-500">
            右侧查看已创建的分享链接，可直接打开、复制或删除。
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {shareLinks.length === 0 ? (
            <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-sm text-gray-500">
              暂无分享链接，先在左侧选择文章并生成。
            </div>
          ) : (
            <table className="w-full min-w-[720px]">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="px-5 py-3 font-medium">分享对象</th>
                  <th className="px-5 py-3 font-medium">有效日期</th>
                  <th className="px-5 py-3 font-medium">剩余时间</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {shareLinks.map((share) => (
                  <tr key={share.id} className="border-b border-gray-100 align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {buildShareObjectLabel(share)}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {share.articleTitles.join(" / ")}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatExpiry(share.expiresAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatRemainingDays(share.expiresAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={share.shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                        >
                          打开链接
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyShareLink(share.shareUrl)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          复制链接
                        </button>
                        <div
                          ref={editingExpiryId === share.id ? expiryDropdownRef : null}
                          className="relative"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditingExpiryId(
                                editingExpiryId === share.id ? null : share.id,
                              )
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            更换过期
                          </button>
                          {editingExpiryId === share.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                              {[
                                { label: "1 小时", value: 1 },
                                { label: "24 小时", value: 24 },
                                { label: "3 天", value: 72 },
                                { label: "7 天", value: 168 },
                                { label: "30 天", value: 720 },
                                { label: "永久有效", value: "never" },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  disabled={updatingExpiryId === share.id}
                                  onClick={() =>
                                    handleUpdateExpiry(
                                      share,
                                      option.value === "never"
                                        ? null
                                        : (option.value as number),
                                    )
                                  }
                                  className="w-full px-4 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={deletingShareId === share.id}
                          onClick={() => handleDeleteShareLink(share)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingShareId === share.id ? "删除中..." : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
          分享页面入口：`/share/[token]`（添加标题参数：`/share/[token]/title`）
          <Link href="/wiki" className="ml-3 text-blue-600 hover:underline">
            返回 Wiki 工作台
          </Link>
        </div>
      </section>
    </div>
  );
}

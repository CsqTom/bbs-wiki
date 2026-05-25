"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  buildDirectoryTree,
  flattenDirectoryOptions,
  type DirectoryNode,
  type WikiTreeArticle,
  type WikiTreeDirectory,
} from "./wiki-tree";

function TreeNode({
  node,
  pathname,
  expandedIds,
  onToggle,
  onDeleteDirectory,
  onDeleteArticle,
  deletingKey,
}: {
  node: DirectoryNode;
  pathname: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onDeleteDirectory: (node: DirectoryNode) => void;
  onDeleteArticle: (article: WikiTreeArticle & { href: string }) => void;
  deletingKey: string | null;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isDirectoryActive = pathname === node.href;

  return (
    <div className="space-y-1">
      <div
        className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${
          isDirectoryActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
        }`}
      >
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200"
          aria-label={isExpanded ? "Collapse directory" : "Expand directory"}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
        <Link
          href={node.href}
          className="min-w-0 flex-1 truncate text-sm font-medium"
        >
          {node.name}
        </Link>
        <button
          type="button"
          onClick={() => onDeleteDirectory(node)}
          className="rounded px-2 py-1 text-xs text-red-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          删
        </button>
      </div>

      {isExpanded && (
        <div className="ml-5 space-y-1 border-l border-gray-200 pl-3">
          {node.articleLinks.map((article) => {
            const isArticleActive = pathname === article.href;
            return (
              <div
                key={article.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  isArticleActive
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100"
                }`}
              >
                <Link href={article.href} className="min-w-0 flex-1 truncate text-sm">
                  {article.title}
                </Link>
                <button
                  type="button"
                  disabled={deletingKey === `article:${article.id}`}
                  onClick={() => onDeleteArticle(article)}
                  className="rounded px-2 py-1 text-xs text-red-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                >
                  {deletingKey === `article:${article.id}` ? "..." : "删"}
                </button>
              </div>
            );
          })}

          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              pathname={pathname}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onDeleteDirectory={onDeleteDirectory}
              onDeleteArticle={onDeleteArticle}
              deletingKey={deletingKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CollaborativeArticleItem {
  id: string;
  title: string;
  ownerName: string;
  ownerId: string;
}

export function WikiSidebar({
  directories,
  rootArticles,
  collaborativeArticles = [],
}: {
  directories: WikiTreeDirectory[];
  rootArticles: WikiTreeArticle[];
  collaborativeArticles?: CollaborativeArticleItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showCreateDir, setShowCreateDir] = useState(false);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const tree = useMemo(() => buildDirectoryTree(directories), [directories]);
  const directoryOptions = useMemo(() => flattenDirectoryOptions(tree), [tree]);
  const directoryHrefMap = useMemo(
    () => new Map(directoryOptions.map((option) => [option.id, option.href])),
    [directoryOptions],
  );
  const confirm = useConfirm();
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(directories.map((directory) => directory.id)),
  );

  const activeDirectoryId = useMemo(() => {
    if (!pathname || pathname === "/wiki") return "";
    
    const exactMatch = directoryOptions.find((opt) => opt.href === pathname);
    if (exactMatch) return exactMatch.id;
    
    let deepestDirId = "";
    let maxLen = 0;
    for (const opt of directoryOptions) {
      if (pathname.startsWith(opt.href + "/")) {
        if (opt.href.length > maxLen) {
          maxLen = opt.href.length;
          deepestDirId = opt.id;
        }
      }
    }
    return deepestDirId;
  }, [pathname, directoryOptions]);

  function toggleDirectory(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCreateDirectory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parentId = (form.get("parentId") as string) || null;
    const res = await fetch("/api/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "directory",
        name: form.get("name"),
        parentId,
      }),
    });
    if (!res.ok) return;

    const created = (await res.json()) as {
      id: string;
      slug: string;
      parentId: string | null;
    };
    const parentHref = created.parentId
      ? directoryHrefMap.get(created.parentId) ?? "/wiki"
      : "/wiki";
    const nextHref =
      parentHref === "/wiki"
        ? `/wiki/${created.slug}`
        : `${parentHref}/${created.slug}`;

    setExpandedIds((prev) => new Set(prev).add(created.id));
    setShowCreateDir(false);
    router.push(nextHref);
    router.refresh();
  }

  async function handleCreateArticle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const directoryId = (form.get("directoryId") as string) || null;
    const res = await fetch("/api/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "article",
        title: form.get("title"),
        directoryId,
      }),
    });
    if (!res.ok) return;

    const created = (await res.json()) as {
      slug: string;
      directoryId: string | null;
    };
    const nextHref = created.directoryId
      ? `${directoryHrefMap.get(created.directoryId) ?? "/wiki"}/${created.slug}`
      : `/wiki/${created.slug}`;

    setShowCreateArticle(false);
    router.push(nextHref);
    router.refresh();
  }

  async function handleDelete(
    type: "article" | "directory",
    id: string,
    label: string,
    href?: string,
  ) {
    const isConfirmed = await confirm({
      title: "确认删除",
      message: type === "directory"
        ? `确定删除 "${label}"？这将会连同内部的子目录和文章一起删除。`
        : `确定删除 "${label}"？`,
      confirmText: "删除",
      danger: true
    });
    if (!isConfirmed) return;

    const requestKey = `${type}:${id}`;
    setDeletingKey(requestKey);

    try {
      const res = await fetch(`/api/wiki/${id}?type=${type}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        window.alert(data?.error ?? "删除失败");
        return;
      }

      if (
        href &&
        (pathname === href ||
          (type === "directory" && pathname.startsWith(`${href}/`)))
      ) {
        router.push("/wiki");
      }
      router.refresh();
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-900">My Wiki</h1>
        <p className="mt-1 text-sm text-gray-500">
          左侧管理目录树，右侧直接打开文章内容。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreateDir((value) => !value)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            新建目录
          </button>
          <button
            type="button"
            onClick={() => setShowCreateArticle((value) => !value)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
          >
            新建文章
          </button>
          <Link
            href="/wiki/shares"
            className={`rounded-lg px-3 py-1.5 text-sm text-white flex items-center justify-center ${
              pathname === "/wiki/shares"
                ? "bg-violet-700 hover:bg-violet-800"
                : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            分享管理
          </Link>
        </div>
      </div>

      {(showCreateDir || showCreateArticle) && (
        <div className="space-y-3 border-b border-gray-200 bg-gray-50 px-4 py-4">
          {showCreateDir && (
            <form onSubmit={handleCreateDirectory} className="space-y-2">
              <input
                name="name"
                placeholder="目录名称"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                name="parentId"
                defaultValue={activeDirectoryId}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">根目录</option>
                {directoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white"
              >
                创建
              </button>
            </form>
          )}

          {showCreateArticle && (
            <form onSubmit={handleCreateArticle} className="space-y-2">
              <input
                name="title"
                placeholder="文章标题"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                name="directoryId"
                defaultValue={activeDirectoryId}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">无目录 (根目录)</option>
                {directoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white"
              >
                创建
              </button>
            </form>
          )}
        </div>
      )}

      {/* 我的Wiki */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pb-1 pt-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            我的Wiki
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
          <div className="space-y-1">
            {rootArticles.map((article) => {
              const href = `/wiki/${article.slug}`;
              const isActive = pathname === href;
              return (
                <div
                  key={article.id}
                  className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                  }`}
                >
                  <Link href={href} className="min-w-0 flex-1 truncate text-sm">
                    {article.title}
                  </Link>
                  <button
                    type="button"
                    disabled={deletingKey === `article:${article.id}`}
                    onClick={() =>
                      handleDelete("article", article.id, article.title, href)
                    }
                    className="rounded px-2 py-1 text-xs text-red-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingKey === `article:${article.id}` ? "..." : "删"}
                  </button>
                </div>
              );
            })}
          </div>

          {tree.length > 0 && (
            <div className="mt-4 space-y-2">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  pathname={pathname}
                  expandedIds={expandedIds}
                  onToggle={toggleDirectory}
                  onDeleteDirectory={(directory) =>
                    handleDelete(
                      "directory",
                      directory.id,
                      directory.name,
                      directory.href,
                    )
                  }
                  onDeleteArticle={(article) =>
                    handleDelete("article", article.id, article.title, article.href)
                  }
                  deletingKey={deletingKey}
                />
              ))}
            </div>
          )}

          {tree.length === 0 && rootArticles.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              你的 wiki 为空。创建一个目录或文章来开始。
            </p>
          )}
        </div>
      </div>

      {/* 协作Wiki */}
      {collaborativeArticles.length > 0 && (
        <>
          <div className="shrink-0 border-t border-gray-200" />
          <div className="flex min-h-0 flex-[0.35] flex-col overflow-hidden">
            <div className="shrink-0 px-4 pb-1 pt-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                协作Wiki
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
              <div className="space-y-1">
                {collaborativeArticles.map((art) => {
                  const href = `/wiki/collaborative/${art.id}`;
                  const isActive = pathname === href;
                  return (
                    <div
                      key={art.id}
                      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <Link
                        href={href}
                        className="min-w-0 flex-1 truncate text-sm"
                      >
                        {art.title}
                      </Link>
                      <span className="shrink-0 text-xs text-gray-400">
                        {art.ownerName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

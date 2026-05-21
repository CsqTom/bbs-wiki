"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface WikiArticle {
  id: string;
  title: string;
  slug: string;
  directoryId: string | null;
}

interface WikiDirectory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  wikiArticles: WikiArticle[];
}

interface DirectoryNode extends WikiDirectory {
  href: string;
  children: DirectoryNode[];
  articleLinks: Array<WikiArticle & { href: string }>;
}

function buildDirectoryTree(
  directories: WikiDirectory[],
  parentId: string | null = null,
  parentSegments: string[] = [],
): DirectoryNode[] {
  return directories
    .filter((directory) => directory.parentId === parentId)
    .map((directory) => {
      const pathSegments = [...parentSegments, directory.slug];
      const href = `/wiki/${pathSegments.join("/")}`;

      return {
        ...directory,
        href,
        children: buildDirectoryTree(directories, directory.id, pathSegments),
        articleLinks: directory.wikiArticles.map((article) => ({
          ...article,
          href: `${href}/${article.slug}`,
        })),
      };
    });
}

function flattenDirectoryOptions(
  nodes: DirectoryNode[],
  depth = 0,
): Array<{ id: string; label: string; href: string }> {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      label: `${"  ".repeat(depth)}${node.name}`,
      href: node.href,
    },
    ...flattenDirectoryOptions(node.children, depth + 1),
  ]);
}

function TreeNode({
  node,
  pathname,
  expandedIds,
  onToggle,
  onDeleteDirectory,
  onDeleteArticle,
}: {
  node: DirectoryNode;
  pathname: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onDeleteDirectory: (node: DirectoryNode) => void;
  onDeleteArticle: (article: WikiArticle & { href: string }) => void;
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
        <Link href={node.href} className="min-w-0 flex-1 truncate text-sm font-medium">
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
                  onClick={() => onDeleteArticle(article)}
                  className="rounded px-2 py-1 text-xs text-red-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  删
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WikiSidebar({
  directories,
  rootArticles,
}: {
  directories: WikiDirectory[];
  rootArticles: WikiArticle[];
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
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(directories.map((directory) => directory.id)),
  );

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

    const created = (await res.json()) as { id: string; slug: string; parentId: string | null };
    const parentHref = created.parentId
      ? directoryHrefMap.get(created.parentId) ?? "/wiki"
      : "/wiki";
    const nextHref =
      parentHref === "/wiki" ? `/wiki/${created.slug}` : `${parentHref}/${created.slug}`;

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
    const confirmed = window.confirm(
      type === "directory"
        ? `Delete "${label}"? This will also delete nested directories and articles.`
        : `Delete "${label}"?`,
    );
    if (!confirmed) return;

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
        window.alert(data?.error ?? "Delete failed");
        return;
      }

      if (
        href &&
        (pathname === href || (type === "directory" && pathname.startsWith(`${href}/`)))
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
        </div>
      </div>

      {(showCreateDir || showCreateArticle) && (
        <div className="space-y-3 border-b border-gray-200 bg-gray-50 px-4 py-4">
          {showCreateDir && (
            <form onSubmit={handleCreateDirectory} className="space-y-2">
              <input
                name="name"
                placeholder="Directory name"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                name="parentId"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Root level</option>
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
                Create
              </button>
            </form>
          )}

          {showCreateArticle && (
            <form onSubmit={handleCreateArticle} className="space-y-2">
              <input
                name="title"
                placeholder="Article title"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                name="directoryId"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">No directory (root level)</option>
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
                Create
              </button>
            </form>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
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
              />
            ))}
          </div>
        )}

        {tree.length === 0 && rootArticles.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            Your wiki is empty. Create a directory or article to get started.
          </p>
        )}
      </div>
    </aside>
  );
}

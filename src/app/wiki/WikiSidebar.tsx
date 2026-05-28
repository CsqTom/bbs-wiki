"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";
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
  isSelectionMode,
  selectedArticleIds,
  onToggleArticleSelection,
}: {
  node: DirectoryNode;
  pathname: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onDeleteDirectory: (node: DirectoryNode) => void;
  onDeleteArticle: (article: WikiTreeArticle & { href: string }) => void;
  deletingKey: string | null;
  isSelectionMode: boolean;
  selectedArticleIds: Set<string>;
  onToggleArticleSelection: (articleId: string) => void;
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
          className={`rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-50 hover:text-red-600 ${
            isSelectionMode ? "hidden" : "opacity-0 group-hover:opacity-100"
          }`}
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
                {isSelectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedArticleIds.has(article.id)}
                    onChange={() => onToggleArticleSelection(article.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                )}
                <Link href={article.href} className="min-w-0 flex-1 truncate text-sm">
                  {article.title}
                </Link>
                {!isSelectionMode && (
                  <button
                    type="button"
                    disabled={deletingKey === `article:${article.id}`}
                    onClick={() => onDeleteArticle(article)}
                    className="rounded px-2 py-1 text-xs text-red-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingKey === `article:${article.id}` ? "..." : "删"}
                  </button>
                )}
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
              isSelectionMode={isSelectionMode}
              selectedArticleIds={selectedArticleIds}
              onToggleArticleSelection={onToggleArticleSelection}
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

interface WritableFileHandleLike {
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

interface WritableDirectoryHandleLike {
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<WritableFileHandleLike>;
}

function isMarkdownFile(file: File) {
  return /\.md$/i.test(file.name);
}

function triggerMarkdownDownload(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

async function saveMarkdownFilesToDirectory(
  items: Array<{ fileName: string; content: string }>,
) {
  const pickerWindow = window as Window & {
    showDirectoryPicker?: () => Promise<WritableDirectoryHandleLike>;
  };

  if (!pickerWindow.showDirectoryPicker) {
    return false;
  }

  const directoryHandle = await pickerWindow.showDirectoryPicker();

  for (const item of items) {
    const fileHandle = await directoryHandle.getFileHandle(item.fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(item.content);
    await writable.close();
  }

  return true;
}

function collectArticleLinks(
  nodes: DirectoryNode[],
): Array<WikiTreeArticle & { href: string }> {
  return nodes.flatMap((node) => [
    ...node.articleLinks,
    ...collectArticleLinks(node.children),
  ]);
}

type QuickCreateAction = "sibling-directory" | "child-directory" | "article";

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
  const importInputRef = useRef<HTMLInputElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const tree = useMemo(() => buildDirectoryTree(directories), [directories]);
  const directoryOptions = useMemo(() => flattenDirectoryOptions(tree), [tree]);
  const directoryHrefMap = useMemo(
    () => new Map(directoryOptions.map((option) => [option.id, option.href])),
    [directoryOptions],
  );
  const directoryLabelMap = useMemo(
    () =>
      new Map(
        directoryOptions.map((option) => [option.id, option.label.trim() || option.id]),
      ),
    [directoryOptions],
  );
  const directoryMap = useMemo(
    () => new Map(directories.map((directory) => [directory.id, directory])),
    [directories],
  );
  const articleLinkMap = useMemo(() => {
    const rootLinks = rootArticles.map((article) => ({
      ...article,
      href: `/wiki/${article.slug}`,
    }));

    return new Map(
      [...rootLinks, ...collectArticleLinks(tree)].map((article) => [
        article.href,
        article,
      ]),
    );
  }, [rootArticles, tree]);
  const confirm = useConfirm();
  const prompt = usePrompt();
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
  const selectedArticleIdSet = useMemo(
    () => new Set(selectedArticleIds),
    [selectedArticleIds],
  );
  const selectedDirectory = useMemo(() => {
    const matched = directoryOptions.find((option) => option.href === pathname);
    if (!matched) return null;
    return directoryMap.get(matched.id) ?? null;
  }, [directoryMap, directoryOptions, pathname]);
  const selectedArticle = useMemo(
    () => (pathname ? articleLinkMap.get(pathname) ?? null : null),
    [articleLinkMap, pathname],
  );
  const createContext = useMemo(() => {
    if (selectedDirectory) {
      return {
        selectedType: "directory" as const,
        createDirectoryParentId: selectedDirectory.parentId ?? null,
        createChildDirectoryParentId: selectedDirectory.id,
        createArticleDirectoryId: selectedDirectory.id,
        label: `${selectedDirectory.name}（目录）`,
        siblingDirectoryMessage: `将在目录“${selectedDirectory.name}”所在层级新建同级目录。`,
        childDirectoryMessage: `将在目录“${selectedDirectory.name}”下新建子目录。`,
        articleMessage: `将在目录“${selectedDirectory.name}”下新建文章。`,
      };
    }

    if (selectedArticle) {
      const parentName = selectedArticle.directoryId
        ? directoryMap.get(selectedArticle.directoryId)?.name ?? "当前目录"
        : "根目录";

      return {
        selectedType: "article" as const,
        createDirectoryParentId: selectedArticle.directoryId ?? null,
        createChildDirectoryParentId: selectedArticle.directoryId ?? null,
        createArticleDirectoryId: selectedArticle.directoryId ?? null,
        label: `${selectedArticle.title}（文章）`,
        siblingDirectoryMessage:
          selectedArticle.directoryId
            ? `将在文章“${selectedArticle.title}”所在目录“${parentName}”下新建子目录。`
            : `将在文章“${selectedArticle.title}”所在位置下新建根目录级目录。`,
        childDirectoryMessage:
          selectedArticle.directoryId
            ? `将在文章“${selectedArticle.title}”所在目录“${parentName}”下新建子目录。`
            : `将在文章“${selectedArticle.title}”所在位置下新建根目录级目录。`,
        articleMessage:
          selectedArticle.directoryId
            ? `将在文章“${selectedArticle.title}”所在目录“${parentName}”下新建文章。`
            : `将在文章“${selectedArticle.title}”所在位置下新建根目录文章。`,
      };
    }

    return {
      selectedType: "root" as const,
      createDirectoryParentId: null,
      createChildDirectoryParentId: null,
      createArticleDirectoryId: null,
      label: "My Wiki 根节点",
      siblingDirectoryMessage: "当前未选中目录或文章，将在根目录新建目录。",
      childDirectoryMessage: "当前未选中目录或文章，将在根目录新建子目录。",
      articleMessage: "当前未选中目录或文章，将在根目录新建文章。",
    };
  }, [directoryMap, selectedArticle, selectedDirectory]);
  const importTargetLabel = activeDirectoryId
    ? directoryLabelMap.get(activeDirectoryId) ?? "当前目录"
    : "根目录";

  useEffect(() => {
    if (!isCreateMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!createMenuRef.current) return;
      if (createMenuRef.current.contains(event.target as Node)) return;
      setIsCreateMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCreateMenuOpen]);

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

  function toggleArticleSelection(articleId: string) {
    setSelectedArticleIds((previous) =>
      previous.includes(articleId)
        ? previous.filter((id) => id !== articleId)
        : [...previous, articleId],
    );
  }

  function resetSelectionMode() {
    setIsSelectionMode(false);
    setSelectedArticleIds([]);
  }

  const quickCreateActions = useMemo(() => {
    if (createContext.selectedType === "directory") {
      return [
        {
          key: "sibling-directory" as const,
          label: "同级目录",
        },
        {
          key: "child-directory" as const,
          label: "子目录",
        },
        {
          key: "article" as const,
          label: "文章",
        },
      ];
    }

    return [
      {
        key: "child-directory" as const,
        label: "子目录",
      },
      {
        key: "article" as const,
        label: "文章",
      },
    ];
  }, [createContext.selectedType]);

  async function handleQuickCreate(action: QuickCreateAction) {
    setIsCreateMenuOpen(false);

    const isDirectoryAction =
      action === "sibling-directory" || action === "child-directory";
    const title = isDirectoryAction ? "新建目录" : "新建文章";
    const message =
      action === "sibling-directory"
        ? createContext.siblingDirectoryMessage
        : action === "child-directory"
          ? createContext.childDirectoryMessage
          : createContext.articleMessage;

    const name = await prompt({
      title,
      message: `${message}\n请输入名称：`,
      defaultValue: "",
      confirmText: "创建",
      cancelText: "取消",
    });

    if (!name?.trim()) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const payload =
        isDirectoryAction
          ? {
              type: "directory",
              name: name.trim(),
              parentId:
                action === "child-directory"
                  ? createContext.createChildDirectoryParentId
                  : createContext.createDirectoryParentId,
            }
          : {
              type: "article",
              title: name.trim(),
              directoryId: createContext.createArticleDirectoryId,
            };

      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as
        | {
            error?: string;
            id?: string;
            slug?: string;
            parentId?: string | null;
            directoryId?: string | null;
          }
        | null;

      if (!res.ok || !data?.slug) {
        throw new Error(data?.error ?? "创建失败，请稍后重试。");
      }

      if (isDirectoryAction) {
        const parentHref = data.parentId
          ? directoryHrefMap.get(data.parentId) ?? "/wiki"
          : "/wiki";
        const nextHref =
          parentHref === "/wiki"
            ? `/wiki/${data.slug}`
            : `${parentHref}/${data.slug}`;

        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (data.id) next.add(data.id);
          if (data.parentId) next.add(data.parentId);
          return next;
        });
        router.push(nextHref);
      } else {
        const nextHref = data.directoryId
          ? `${directoryHrefMap.get(data.directoryId) ?? "/wiki"}/${data.slug}`
          : `/wiki/${data.slug}`;

        if (data.directoryId) {
          setExpandedIds((prev) => new Set(prev).add(data.directoryId as string));
        }
        router.push(nextHref);
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建失败，请稍后重试。";
      setFeedback({ type: "error", text: message });
      window.alert(message);
    } finally {
      setIsCreating(false);
    }
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

  async function handleImportFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(isMarkdownFile);
    if (files.length === 0) {
      e.target.value = "";
      window.alert("请至少选择一个 .md 文件。");
      return;
    }

    setIsImporting(true);
    setFeedback(null);

    try {
      const items = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          content: await file.text(),
        })),
      );

      const res = await fetch("/api/wiki/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directoryId: activeDirectoryId || null,
          items,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { count?: number; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "批量导入失败，请稍后重试。");
      }

      setFeedback({
        type: "success",
        text: `已导入 ${data?.count ?? items.length} 个 Markdown 文件到${importTargetLabel}。`,
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "批量导入失败，请稍后重试。";
      setFeedback({ type: "error", text: message });
      window.alert(message);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  }

  async function handleExportSelectedArticles() {
    if (selectedArticleIds.length === 0) {
      window.alert("请先选择至少一篇文章后再导出。");
      return;
    }

    setIsExporting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/wiki/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: selectedArticleIds }),
      });

      const data = (await res.json().catch(() => null)) as
        | {
            count?: number;
            error?: string;
            items?: Array<{ fileName: string; content: string }>;
          }
        | null;

      if (!res.ok || !data?.items) {
        throw new Error(data?.error ?? "批量导出失败，请稍后重试。");
      }

      let savedToDirectory = false;

      try {
        savedToDirectory = await saveMarkdownFilesToDirectory(data.items);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }

      if (!savedToDirectory) {
        for (const item of data.items) {
          triggerMarkdownDownload(item.fileName, item.content);
          await new Promise((resolve) => window.setTimeout(resolve, 80));
        }
      }

      setFeedback({
        type: "success",
        text: savedToDirectory
          ? `已导出 ${data.count ?? data.items.length} 个 Markdown 文件到所选目录。`
          : `已导出 ${data.count ?? data.items.length} 个 Markdown 文件。`,
      });
      resetSelectionMode();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "批量导出失败，请稍后重试。";
      setFeedback({ type: "error", text: message });
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <input
          ref={importInputRef}
          type="file"
          accept=".md,text/markdown"
          multiple
          className="hidden"
          onChange={handleImportFiles}
        />
        <h1 className="text-lg font-semibold text-gray-900">My Wiki</h1>
        <p className="mt-1 text-sm text-gray-500">
          左侧管理目录树，右侧直接打开文章内容。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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
          <button
            type="button"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {isImporting ? "导入中..." : "批量导入"}
          </button>
          {!isSelectionMode ? (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setIsSelectionMode(true);
              }}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
            >
              批量导出
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportSelectedArticles}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isExporting ? "导出中..." : `导出所选 (${selectedArticleIds.length})`}
              </button>
              <button
                type="button"
                onClick={resetSelectionMode}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                取消导出
              </button>
            </>
          )}
        </div>
        {isSelectionMode && (
          <p className="mt-3 text-xs text-slate-600">
            导出模式已开启，请在左侧勾选要下载的文章。
          </p>
        )}
        {!isSelectionMode && (
          <p className="mt-3 text-xs text-gray-500">
            批量导入默认写入到：{importTargetLabel}
          </p>
        )}
        {feedback && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* 我的Wiki */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-4 pb-1 pt-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            我的Wiki
          </h2>
          <div
            ref={createMenuRef}
            className="relative"
          >
            <button
              type="button"
              disabled={isCreating}
              onClick={() => setIsCreateMenuOpen((value) => !value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              aria-haspopup="menu"
              aria-expanded={isCreateMenuOpen}
            >
              {isCreating ? "创建中..." : "+新建"}
            </button>
            {isCreateMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-28 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                {quickCreateActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => void handleQuickCreate(action.key)}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 px-4 pb-2 text-xs text-gray-400">
          当前定位：{createContext.label}
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
                  {isSelectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedArticleIdSet.has(article.id)}
                      onChange={() => toggleArticleSelection(article.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  )}
                  <Link href={href} className="min-w-0 flex-1 truncate text-sm">
                    {article.title}
                  </Link>
                  {!isSelectionMode && (
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
                  )}
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
                  isSelectionMode={isSelectionMode}
                  selectedArticleIds={selectedArticleIdSet}
                  onToggleArticleSelection={toggleArticleSelection}
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

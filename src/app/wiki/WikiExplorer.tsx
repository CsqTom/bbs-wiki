"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WikiArticle {
  id: string;
  title: string;
  slug: string;
  directoryId: string | null;
  updatedAt: string;
  createdAt: string;
}

interface WikiDirectory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  wikiArticles: WikiArticle[];
  createdAt: string;
  updatedAt: string;
}

export function WikiExplorer({
  directories,
  rootArticles,
}: {
  directories: WikiDirectory[];
  rootArticles: WikiArticle[];
}) {
  const router = useRouter();
  const [showCreateDir, setShowCreateDir] = useState(false);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  async function handleCreateDirectory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "directory",
        name: form.get("name"),
        parentId: form.get("parentId") || null,
      }),
    });
    if (res.ok) {
      router.refresh();
      setShowCreateDir(false);
    }
  }

  async function handleCreateArticle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "article",
        title: form.get("title"),
        directoryId: form.get("directoryId") || null,
      }),
    });
    if (res.ok) {
      router.refresh();
      setShowCreateArticle(false);
    }
  }

  async function handleDelete(
    type: "article" | "directory",
    id: string,
    label: string,
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

      router.refresh();
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowCreateDir(!showCreateDir)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          New Directory
        </button>
        <button
          onClick={() => setShowCreateArticle(!showCreateArticle)}
          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
        >
          New Article
        </button>
      </div>

      {showCreateDir && (
        <form
          onSubmit={handleCreateDirectory}
          className="p-3 bg-white rounded-lg shadow space-y-2"
        >
          <input
            name="name"
            placeholder="Directory name"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="parentId"
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Root level</option>
            {directories.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
          >
            Create
          </button>
        </form>
      )}

      {showCreateArticle && (
        <form
          onSubmit={handleCreateArticle}
          className="p-3 bg-white rounded-lg shadow space-y-2"
        >
          <input
            name="title"
            placeholder="Article title"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="directoryId"
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">No directory (root level)</option>
            {directories.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
          >
            Create
          </button>
        </form>
      )}

      {/* Root-level articles (no directory) */}
      {rootArticles.length > 0 && (
        <div className="space-y-1">
          {rootArticles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between gap-4 bg-white rounded-lg shadow p-4"
            >
              <Link
                href={`/wiki/${article.slug}`}
                className="text-blue-600 hover:underline"
              >
                📄 {article.title}
              </Link>
              <button
                type="button"
                onClick={() => handleDelete("article", article.id, article.title)}
                disabled={deletingKey === `article:${article.id}`}
                className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingKey === `article:${article.id}` ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Directories with their articles */}
      <div className="space-y-2">
        {directories.map((dir) => (
          <div key={dir.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium text-lg">📁 {dir.name}</h3>
              <button
                type="button"
                onClick={() => handleDelete("directory", dir.id, dir.name)}
                disabled={deletingKey === `directory:${dir.id}`}
                className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingKey === `directory:${dir.id}` ? "Deleting..." : "Delete"}
              </button>
            </div>
            {dir.wikiArticles.length > 0 ? (
              <ul className="mt-2 space-y-1 ml-4">
                {dir.wikiArticles.map((article) => (
                  <li
                    key={article.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/wiki/${dir.slug}/${article.slug}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📄 {article.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete("article", article.id, article.title)
                      }
                      disabled={deletingKey === `article:${article.id}`}
                      className="shrink-0 rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingKey === `article:${article.id}` ? "Deleting..." : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm mt-1 ml-4">
                No articles yet
              </p>
            )}
          </div>
        ))}
      </div>

      {directories.length === 0 && rootArticles.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Your wiki is empty. Create a directory or article to get started.
        </p>
      )}
    </div>
  );
}

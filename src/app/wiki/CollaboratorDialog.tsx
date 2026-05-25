"use client";

import { useState, useEffect, useRef } from "react";

interface CollaboratorDialogProps {
  articleId: string;
  onClose: () => void;
}

interface CollaboratorUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface CollaboratorEntry {
  id: string;
  user: CollaboratorUser;
}

export function CollaboratorDialog({
  articleId,
  onClose,
}: CollaboratorDialogProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollaboratorUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/wiki/collaborators?articleId=${articleId}`)
      .then((r) => r.json())
      .then(setCollaborators)
      .catch(() => {});
  }, [articleId]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}&excludeArticleId=${articleId}`,
        );
        const data = await res.json();
        setSearchResults(data.items || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, articleId]);

  async function addCollaborator(userId: string) {
    const res = await fetch("/api/wiki/collaborators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, userId }),
    });
    if (res.ok) {
      const newEntry = await res.json();
      setCollaborators((prev) => [...prev, newEntry]);
      setSearchQuery("");
      setSearchResults([]);
    }
  }

  async function removeCollaborator(collabId: string) {
    const res = await fetch(`/api/wiki/collaborators/${collabId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">管理协作人</h3>
            <button
              onClick={onClose}
              className="text-xl leading-none text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length < 2) setShowResults(false);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
              placeholder="搜索用户名称..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showResults && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {isSearching ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    搜索中...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    未找到用户
                  </div>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => addCollaborator(u.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          u.name[0]
                        )}
                      </span>
                      {u.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">
              当前协作人 ({collaborators.length})
            </h4>
            {collaborators.length === 0 ? (
              <p className="text-sm text-gray-500">暂无协作人</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs">
                        {c.user.avatar ? (
                          <img
                            src={c.user.avatar}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          c.user.name[0]
                        )}
                      </span>
                      <span className="text-sm">{c.user.name}</span>
                    </div>
                    <button
                      onClick={() => removeCollaborator(c.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  boardPermissions: {
    id: string;
    userId: string;
    user: { id: string; name: string; email: string };
  }[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function BoardList({
  boards: initialBoards,
  allUsers,
}: {
  boards: Board[];
  allUsers: User[];
}) {
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [showCreate, setShowCreate] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        isPublic: form.get("isPublic") === "on",
      }),
    });
    if (res.ok) {
      router.refresh();
      setShowCreate(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this board?")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    setBoards(boards.filter((b) => b.id !== id));
    router.refresh();
  }

  async function handleAddPermission(boardId: string, userId: string) {
    await fetch(`/api/boards/${boardId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.refresh();
  }

  async function handleRemovePermission(boardId: string, permissionId: string) {
    await fetch(`/api/boards/${boardId}/permissions/${permissionId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {showCreate ? "Cancel" : "Create Board"}
      </button>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-4 bg-white rounded-lg shadow space-y-3"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              name="name"
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              name="description"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isPublic" />
            <span className="text-sm">Public board (visible to guests)</span>
          </label>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Create
          </button>
        </form>
      )}

      <div className="space-y-3">
        {boards.map((board) => (
          <div key={board.id} className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{board.name}</h3>
                <p className="text-sm text-gray-600">{board.description}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    board.isPublic
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {board.isPublic ? "Public" : "Private"}
                </span>
              </div>
              <button
                onClick={() => handleDelete(board.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>

            {!board.isPublic && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2">Access Permissions:</p>
                <ul className="text-sm space-y-1">
                  {board.boardPermissions.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between"
                    >
                      <span>
                        {p.user.name} ({p.user.email})
                      </span>
                      <button
                        onClick={() => handleRemovePermission(board.id, p.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <select
                  onChange={(e) => {
                    if (e.target.value)
                      handleAddPermission(board.id, e.target.value);
                  }}
                  className="mt-2 border rounded px-2 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Add user access...
                  </option>
                  {allUsers
                    .filter(
                      (u) =>
                        !board.boardPermissions.find(
                          (p) => p.userId === u.id,
                        ),
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

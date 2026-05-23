"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  boardPermissions: BoardPermission[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface BoardPermission {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface ApiErrorResponse {
  error?: string;
}

function isBoardPermission(
  data: BoardPermission | ApiErrorResponse | null,
): data is BoardPermission {
  return Boolean(
    data &&
      "id" in data &&
      "userId" in data &&
      "role" in data &&
      "user" in data,
  );
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
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    initialBoards[0]?.id ?? null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const selectedBoard =
    boards.find((board) => board.id === selectedBoardId) ?? null;

  useEffect(() => {
    if (boards.length === 0) {
      setSelectedBoardId(null);
      return;
    }

    if (!selectedBoardId || !boards.some((board) => board.id === selectedBoardId)) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (!selectedBoard) {
      setEditName("");
      setEditDescription("");
      return;
    }

    setEditName(selectedBoard.name);
    setEditDescription(selectedBoard.description ?? "");
  }, [selectedBoardId, selectedBoard?.name, selectedBoard?.description]);

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
      const createdBoard = (await res.json()) as Omit<Board, "boardPermissions">;
      const nextBoard: Board = {
        ...createdBoard,
        boardPermissions: [],
      };
      setBoards([nextBoard, ...boards]);
      setSelectedBoardId(nextBoard.id);
      router.refresh();
      setShowCreate(false);
      e.currentTarget.reset();
    } else {
      alert("创建版块失败");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个版块吗？")) return;
    const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("删除版块失败");
      return;
    }
    setBoards(boards.filter((b) => b.id !== id));
    router.refresh();
  }

  async function handleUpdate(boardId: string) {
    if (!editName.trim()) {
      alert("请输入版块名称");
      return;
    }

    const res = await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim(),
      }),
    });

    if (!res.ok) {
      alert("更新版块失败");
      return;
    }

    setBoards(
      boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              name: editName.trim(),
              description: editDescription.trim() || null,
            }
          : board,
      ),
    );
    router.refresh();
  }

  async function handleAddPermission(boardId: string, userId: string, role: string = "MEMBER") {
    if (!userId) {
      alert("请先选择要添加的用户");
      return;
    }

    const res = await fetch(`/api/boards/${boardId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });

    const data = (await res.json().catch(() => null)) as
      | BoardPermission
      | ApiErrorResponse
      | null;

    if (!res.ok || !isBoardPermission(data)) {
      const errorMessage =
        data && "error" in data ? data.error ?? "添加成员失败" : "添加成员失败";
      alert(errorMessage);
      return;
    }

    setBoards(
      boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              boardPermissions: [...board.boardPermissions, data],
            }
          : board,
      ),
    );
    setSelectedUsers((prev) => ({ ...prev, [boardId]: "" }));
    setSelectedRoles((prev) => ({ ...prev, [boardId]: "MEMBER" }));
    router.refresh();
  }

  async function handleRemovePermission(boardId: string, permissionId: string) {
    const res = await fetch(`/api/boards/${boardId}/permissions/${permissionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("移除成员失败");
      return;
    }
    setBoards(
      boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              boardPermissions: board.boardPermissions.filter(
                (permission) => permission.id !== permissionId,
              ),
            }
          : board,
      ),
    );
    router.refresh();
  }

  async function handleUpdateRole(boardId: string, permissionId: string, role: string) {
    const res = await fetch(`/api/boards/${boardId}/permissions/${permissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      alert("更新角色失败");
      return;
    }
    setBoards(
      boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              boardPermissions: board.boardPermissions.map((permission) =>
                permission.id === permissionId
                  ? { ...permission, role }
                  : permission,
              ),
            }
          : board,
      ),
    );
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">版块列表</h2>
              <p className="mt-1 text-sm text-gray-500">左侧选择版块，右侧管理成员</p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              {showCreate ? "取消" : "新建"}
            </button>
          </div>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="border-b border-gray-200 p-4 space-y-3 bg-gray-50"
          >
            <div>
              <label className="block text-sm font-medium mb-1">版块名称</label>
              <input
                name="name"
                required
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">版块描述</label>
              <textarea
                name="description"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isPublic" />
              <span className="text-sm">公开版块（游客可见）</span>
            </label>
            <button
              type="submit"
              className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              创建版块
            </button>
          </form>
        )}

        <div className="max-h-[720px] overflow-y-auto p-3">
          {boards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
              暂无版块，请先创建版块
            </div>
          ) : (
            <div className="space-y-2">
              {boards.map((board) => {
                const isSelected = board.id === selectedBoardId;
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => setSelectedBoardId(board.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-gray-900">
                          {board.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                          {board.description || "暂无描述"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                          board.isPublic
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {board.isPublic ? "公开" : "私有"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      成员数：{board.boardPermissions.length}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="space-y-6">
        {selectedBoard ? (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    当前版块：{selectedBoard.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    编辑版块资料，并管理当前版块的成员与版主
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      selectedBoard.isPublic
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedBoard.isPublic ? "公开版块" : "私有版块"}
                  </span>
                  <button
                    onClick={() => handleDelete(selectedBoard.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    删除版块
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">版块名称</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">版块描述</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="min-h-[110px] w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    onClick={() => handleUpdate(selectedBoard.id)}
                    className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    保存版块信息
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">成员管理</h3>
                <p className="mt-1 text-sm text-gray-500">
                  可添加普通成员或版主，并随时调整角色
                </p>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px_100px]">
                <select
                  value={selectedUsers[selectedBoard.id] ?? ""}
                  onChange={(e) =>
                    setSelectedUsers((prev) => ({
                      ...prev,
                      [selectedBoard.id]: e.target.value,
                    }))
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    选择用户...
                  </option>
                  {allUsers
                    .filter(
                      (user) =>
                        !selectedBoard.boardPermissions.find(
                          (permission) => permission.userId === user.id,
                        ),
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
                <select
                  value={selectedRoles[selectedBoard.id] ?? "MEMBER"}
                  onChange={(e) =>
                    setSelectedRoles((prev) => ({
                      ...prev,
                      [selectedBoard.id]: e.target.value,
                    }))
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value="MEMBER">普通成员</option>
                  <option value="MODERATOR">版主</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    handleAddPermission(
                      selectedBoard.id,
                      selectedUsers[selectedBoard.id] ?? "",
                      selectedRoles[selectedBoard.id] ?? "MEMBER",
                    )
                  }
                  disabled={!selectedUsers[selectedBoard.id]}
                  className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  添加
                </button>
              </div>

              {selectedBoard.boardPermissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                  当前版块还没有成员，请先添加成员
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedBoard.boardPermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {permission.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {permission.user.email}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          value={permission.role}
                          onChange={(e) =>
                            handleUpdateRole(
                              selectedBoard.id,
                              permission.id,
                              e.target.value,
                            )
                          }
                          className="rounded border px-3 py-2 text-sm"
                        >
                          <option value="MEMBER">普通成员</option>
                          <option value="MODERATOR">版主</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemovePermission(selectedBoard.id, permission.id)
                          }
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500 shadow-sm">
            请先在左侧选择一个版块，或创建新的版块
          </div>
        )}
      </section>
    </div>
  );
}

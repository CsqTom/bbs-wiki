"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export function UserList({ users: initialUsers }: { users: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);

  async function handleRoleChange(userId: string, newRole: string) {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setUsers(
      users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
    router.refresh();
  }

  async function handleDelete(userId: string) {
    if (!confirm("确定要删除这个用户吗？")) return;
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setUsers(users.filter((u) => u.id !== userId));
    router.refresh();
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left px-4 py-3">姓名</th>
            <th className="text-left px-4 py-3">邮箱</th>
            <th className="text-left px-4 py-3">角色</th>
            <th className="text-left px-4 py-3">注册时间</th>
            <th className="text-left px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="px-4 py-3">{u.name}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="USER">普通用户</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

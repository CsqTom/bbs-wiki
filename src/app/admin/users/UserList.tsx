"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";

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
  const confirm = useConfirm();
  const prompt = usePrompt();

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

  async function handleResetPassword(userId: string) {
    const newPassword = await prompt({
      title: "重置密码",
      message: "请输入新密码：",
      defaultValue: "123456"
    });
    if (!newPassword) return;

    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        alert("密码重置成功");
      } else {
        alert("密码重置失败");
      }
    } catch (e) {
      alert("密码重置失败");
    }
  }

  async function handleDelete(userId: string) {
    const isConfirmed = await confirm({
      title: "删除用户",
      message: "确定要删除这个用户吗？此操作无法撤销。",
      confirmText: "删除",
      danger: true
    });
    if (!isConfirmed) return;
    
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
                  onClick={() => handleResetPassword(u.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                >
                  重置密码
                </button>
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

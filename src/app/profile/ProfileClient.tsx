"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function ProfileClient({ user }: { user: User }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [uploading, setUploading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatar(data.url);
        router.refresh();
      } else {
        alert("头像上传失败");
      }
    } catch (err) {
      alert("头像上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }

    if (!oldPassword || !newPassword) {
      setPasswordError("请填写完整密码信息");
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.ok) {
        setPasswordSuccess("密码修改成功");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordError(data.error || "密码修改失败");
      }
    } catch (err) {
      setPasswordError("密码修改失败");
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-8">
      {/* 个人信息部分 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">基本信息</h2>
        <div className="flex items-start gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  暂无头像
                </div>
              )}
            </div>
            <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded text-sm hover:bg-blue-100 transition-colors">
              {uploading ? "上传中..." : "更换头像"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <div className="space-y-4 flex-1 pt-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">用户名</label>
              <div className="px-3 py-2 bg-gray-50 border rounded text-gray-800">
                {user.name}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">邮箱</label>
              <div className="px-3 py-2 bg-gray-50 border rounded text-gray-800">
                {user.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 修改密码部分 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">修改密码</h2>
        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">原密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="请输入原密码"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="请输入新密码"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="请再次输入新密码"
            />
          </div>

          {passwordError && (
            <div className="text-red-500 text-sm">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="text-green-500 text-sm">{passwordSuccess}</div>
          )}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            更换密码
          </button>
        </form>
      </div>
    </div>
  );
}

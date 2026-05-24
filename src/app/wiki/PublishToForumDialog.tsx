"use client";

import { useState, useEffect } from "react";

interface Board {
  id: string;
  name: string;
  isPublic: boolean;
}

interface PublishToForumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  defaultTitle: string;
}

export function PublishToForumDialog({
  isOpen,
  onClose,
  articleId,
  defaultTitle,
}: PublishToForumDialogProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [title, setTitle] = useState(defaultTitle);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setError("");
      
      // Fetch boards
      fetch("/api/boards")
        .then((res) => res.json())
        .then((data: Board[]) => {
          setBoards(data);
          if (data.length > 0) {
            setSelectedBoardId(data[0].id);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch boards", err);
          setError("加载版块失败");
        });
    }
  }, [isOpen, defaultTitle]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBoardId) {
      setError("请选择版块");
      return;
    }
    if (!title.trim()) {
      setError("请输入标题");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 1. 生成分享链接
      const shareRes = await fetch("/api/wiki/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: [articleId],
          expiresInHours,
        }),
      });

      if (!shareRes.ok) {
        throw new Error("生成分享链接失败");
      }

      const shareData = await shareRes.json();
      const shareUrl = shareData.shareUrl;

      // 2. 创建论坛帖子
      const postContent = `这是从 Wiki 分享的文章，请点击链接查看内容：\n\n[${title}](${shareUrl})`;
      
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: selectedBoardId,
          title: title.trim(),
          content: postContent,
          sourceType: "ARTICLE",
          sourceId: articleId,
        }),
      });

      if (!postRes.ok) {
        const errorData = await postRes.json();
        throw new Error(errorData.error || "发布帖子失败");
      }

      const postData = await postRes.json();
      
      // 3. 发布成功，跳转到帖子页面或关闭弹窗
      window.location.href = `/boards/${selectedBoardId}/posts/${postData.id}`;
      
    } catch (err: any) {
      setError(err.message || "发布失败，请重试");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            发布到论坛
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择版块
              </label>
              <select
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {boards.length === 0 && <option value="">加载中...</option>}
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name} {!board.isPublic && "(私有)"}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                帖子标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                placeholder="请输入帖子标题"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分享链接有效期
              </label>
              <select
                value={expiresInHours === null ? "null" : expiresInHours.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setExpiresInHours(val === "null" ? null : Number(val));
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="null">永久有效</option>
                <option value="1">1小时</option>
                <option value="24">1天</option>
                <option value="168">7天</option>
                <option value="720">30天</option>
              </select>
            </div>
            
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100">
              <p>发布时将自动：</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>为您当前的 Wiki 生成一个{expiresInHours === null ? "永久有效" : "有期限"}的分享链接</li>
                <li>在所选版块创建新帖子，内容自动包含该分享链接</li>
              </ul>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "发布中..." : "确认发布"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

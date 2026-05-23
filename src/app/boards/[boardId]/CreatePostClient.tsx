"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ForumEditor } from "@/components/forum/ForumEditor";

export function CreatePostClient({
  boardId,
  triggerClassName = "",
}: {
  boardId: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = async (content: string) => {
    if (!title.trim()) {
      alert("请输入标题");
      throw new Error("Missing title");
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        title,
        content,
        // sourceType 和 sourceId 现在是可选的
      }),
    });

    if (res.ok) {
      setIsCreating(false);
      setTitle("");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(data?.error ?? "发帖失败");
    }
  };

  if (!isCreating) {
    return (
      <button
        onClick={() => setIsCreating(true)}
        className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium ${triggerClassName}`}
      >
        + 发布新帖
      </button>
    );
  }

  return (
    <div className="mt-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">发布新帖</h2>
        <button
          onClick={() => setIsCreating(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          取消
        </button>
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入标题..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <ForumEditor
        placeholder="输入帖子内容... 支持 Markdown 和 Wiki 链接"
        submitLabel="发布"
        onSubmit={handleSubmit}
      />
    </div>
  );
}

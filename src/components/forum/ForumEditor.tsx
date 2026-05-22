"use client";

import { useState, useRef } from "react";

interface ForumEditorProps {
  initialContent?: string;
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  submitLabel?: string;
}

export function ForumEditor({
  initialContent = "",
  placeholder = "输入内容...",
  onSubmit,
  submitLabel = "发表",
}: ForumEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "wiki");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        insertText(`![图片](${url})`);
      } else {
        alert("上传失败");
      }
    } catch (error) {
      alert("上传失败");
    }
  };

  const handleWikiLink = () => {
    const link = prompt(
      "请输入 Wiki 或分享链接地址（例如: /wiki/my-doc 或 /share/token）:",
      "/wiki/",
    );
    if (link) {
      const normalizedLink = link.trim();
      const title = prompt("请输入链接显示文字:", "Wiki 参考");
      insertText(`[${title || normalizedLink}](${normalizedLink})`);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "提交失败";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col bg-white">
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex gap-2 items-center">
        <button
          type="button"
          onClick={() => insertText("**", "**")}
          className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded"
          title="加粗"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          type="button"
          onClick={() => insertText("*", "*")}
          className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded italic"
          title="斜体"
        >
          I
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <label className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded cursor-pointer">
          🖼️ 图片
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
        <button
          type="button"
          onClick={handleWikiLink}
          className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded"
          title="插入 Wiki 链接"
        >
          📖 Wiki链接
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[150px] p-3 resize-y outline-none focus:ring-0"
      />
      <div className="bg-gray-50 border-t border-gray-300 p-2 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "提交中..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

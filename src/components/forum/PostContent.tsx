"use client";

import MarkdownPreview from "@uiw/react-markdown-preview";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { normalizeForumResourceHref } from "@/lib/forum-resource";

interface PostContentProps {
  content: string;
  onForumResourceOpen?: (href: string) => void;
}

export function PostContent({ content, onForumResourceOpen }: PostContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const normalizedHref = normalizeForumResourceHref(href);

      // 拦截站内 Wiki / 分享链接，在右侧预览面板打开。
      if (normalizedHref) {
        e.preventDefault();

        if (onForumResourceOpen) {
          onForumResourceOpen(normalizedHref);
          return;
        }

        // 更新 URL 参数但不刷新页面，保持滚动条位置
        const params = new URLSearchParams(searchParams.toString());
        params.set("wikiPath", normalizedHref);
        params.delete("wikiAuto");

        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [onForumResourceOpen, router, pathname, searchParams],
  );

  return (
    <div className="prose max-w-none w-full" data-color-mode="light">
      <MarkdownPreview
        source={content}
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || "";
            const normalizedHref = normalizeForumResourceHref(href);
            const isForumResourceLink = Boolean(normalizedHref);

            return (
              <a
                {...props}
                onClick={(e) => handleLinkClick(e, href)}
                target={isForumResourceLink ? undefined : "_blank"}
                rel={isForumResourceLink ? undefined : "noopener noreferrer"}
                className={
                  isForumResourceLink
                    ? "inline-flex cursor-pointer items-center gap-1 text-blue-600 hover:underline"
                    : "text-blue-600 hover:underline"
                }
              >
                {isForumResourceLink && <span className="text-xs">📖</span>}
                {props.children}
              </a>
            );
          },
          img: ({ node: _node, ...props }) => (
            <img {...props} referrerPolicy="no-referrer" />
          ),
        }}
      />
    </div>
  );
}

export function extractThumbnail(content: string): string | null {
  // 匹配 Markdown 图片语法: ![alt](url)
  const mdImageRegex = /!\[.*?\]\((.*?)\)/;
  const match = content.match(mdImageRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // 也可以匹配 HTML img 标签: <img src="url" ... />
  const htmlImageRegex = /<img[^>]+src=["'](.*?)["']/;
  const htmlMatch = content.match(htmlImageRegex);
  
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  return null;
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/!\[.*?\]\(.*?\)/g, "") // 移除图片
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // 链接只保留文字
    .replace(/[#*`_>~]/g, "") // 移除常用 Markdown 符号
    .trim();
}

export interface CreateWikiShareResult {
  id: string;
  token: string;
  title: string | null;
  expiresAt: string | null;
  articleCount: number;
  articleTitles: string[];
  shareUrl: string;
}

export interface WikiShareListItem {
  id: string;
  token: string;
  title: string | null;
  expiresAt: string | null;
  createdAt: string;
  articleCount: number;
  articleTitles: string[];
  shareUrl: string;
}

export async function createWikiShareLink(payload: {
  articleIds: string[];
  expiresInHours: number | null;
}) {
  const response = await fetch("/api/wiki/shares", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | (CreateWikiShareResult & { error?: string })
    | null;

  if (!response.ok || !data) {
    throw new Error(data?.error ?? "生成分享链接失败，请稍后重试。");
  }

  return data;
}

export async function copyShareUrl(shareUrl: string) {
  await navigator.clipboard.writeText(shareUrl);
}

export async function deleteWikiShareLink(shareId: string) {
  const response = await fetch(`/api/wiki/shares/${shareId}`, {
    method: "DELETE",
  });

  const data = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "删除分享链接失败，请稍后重试。");
  }

  return data;
}

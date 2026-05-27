import { prisma } from "@/lib/prisma";
import type { SearchResult } from "@/lib/ai-search";

interface AiConfig {
  apiKey: string;
  model: string;
}

async function loadAiConfig(): Promise<AiConfig | null> {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: ["ai_api_key", "ai_model"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  if (!map.ai_api_key) return null;
  return { apiKey: map.ai_api_key, model: map.ai_model || "deepseek-chat" };
}

function buildSystemPrompt(): string {
  return `你是一个论坛 Wiki 平台的 AI 助手。请根据用户问题，从提供的搜索结果中提取相关信息来回答问题。
规则：
1. 只使用搜索结果中的内容来回答，不要编造信息。
2. 如果搜索结果中没有相关内容，请回答"没有找到相关内容"。
3. 回答要简洁、准确，使用中文。
4. 在回答末尾注明引用的来源标题。`;
}

function buildUserMessage(question: string, results: SearchResult[]): string {
  const context = results
    .map(
      (r, i) =>
        `[来源 ${i + 1}] 类型: ${r.type === "wiki" ? "Wiki文章" : "论坛帖子"}\n标题: ${r.title}\n内容: ${r.snippet}`,
    )
    .join("\n\n---\n\n");

  return `用户问题：${question}\n\n相关搜索结果：\n\n${context || "（无相关搜索结果）"}`;
}

function dedupeSources(results: SearchResult[]): SearchResult[] {
  const unique = new Map<string, SearchResult>();
  for (const result of results) {
    const key = `${result.type}:${result.id}`;
    if (!unique.has(key)) {
      unique.set(key, result);
    }
  }
  return [...unique.values()];
}

export interface AiAnswer {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    type: "wiki" | "post";
    url: string;
  }>;
}

export async function askAi(
  question: string,
  searchResults: SearchResult[],
): Promise<AiAnswer> {
  const config = await loadAiConfig();
  if (!config) {
    return {
      answer:
        "AI 问答尚未配置，请联系管理员在后台配置 API Key。",
      sources: [],
    };
  }

  const response = await fetch(
    "https://api.deepseek.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserMessage(question, searchResults) },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("DeepSeek API error:", response.status, errorText);
    return {
      answer: "AI 问答服务暂不可用，请稍后重试。",
      sources: [],
    };
  }

  const data = await response.json();
  const answer: string =
    data.choices?.[0]?.message?.content || "没有找到相关内容";

  const sources: AiAnswer["sources"] = dedupeSources(searchResults).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    url: r.url,
  }));

  return { answer, sources };
}

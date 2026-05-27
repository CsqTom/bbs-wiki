import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { searchAllContent } from "@/lib/ai-search";
import { askAi } from "@/lib/deepseek";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { question } = await request.json();
  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "请输入问题" }, { status: 400 });
  }

  // 1. Search accessible content
  const searchResults = await searchAllContent({
    id: user.id,
    role: user.role,
  }, question.trim(), {
    limit: 8,
  });

  // 2. Ask AI
  const result = await askAi(question.trim(), searchResults);

  return NextResponse.json(result);
}

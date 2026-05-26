import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

const ALLOWED_KEYS = ["ai_api_key", "ai_model"] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: ALLOWED_KEYS as unknown as string[] } },
  });
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};

  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      updates[key] = String(body[key]);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ success: true });
}

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg(url);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bbs-wiki.com" },
    update: {
      name: "Admin",
      role: "ADMIN",
    },
    create: {
      name: "Admin",
      email: "admin@bbs-wiki.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log(`Admin user created: ${admin.email} (password: admin123)`);

  const existingBoard = await prisma.board.findFirst({
    where: { name: "General Discussion" },
    select: { id: true, name: true },
  });

  const board =
    existingBoard ??
    (await prisma.board.create({
      data: {
        name: "General Discussion",
        description: "A public board for general topics",
        isPublic: true,
      },
    }));

  console.log(`Public board created: ${board.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

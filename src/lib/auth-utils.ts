import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  });

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Login required");
  }
  return user;
}

export async function checkModeratorPermission(userId: string, boardId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  if (user.role === "ADMIN") return true;

  const permission = await prisma.boardPermission.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });

  return permission?.role === "MODERATOR";
}

export async function canDeletePost(userId: string, post: { boardId: string; userId: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  if (user.role === "ADMIN") return true;

  const isModerator = await checkModeratorPermission(userId, post.boardId);
  if (isModerator) return true;

  return false;
}

export async function canEditPost(userId: string, post: { userId: string }) {
  return userId === post.userId;
}

export async function canDeleteComment(userId: string, comment: { postId: string; userId: string }, postBoardId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  if (user.role === "ADMIN") return true;

  const isModerator = await checkModeratorPermission(userId, postBoardId);
  if (isModerator) return true;

  return userId === comment.userId;
}

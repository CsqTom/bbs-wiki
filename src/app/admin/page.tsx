import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">论坛管理后台</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/boards"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">版块管理</h2>
          <p className="text-gray-600 text-sm mt-1">
            创建、编辑和删除论坛版块
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">用户管理</h2>
          <p className="text-gray-600 text-sm mt-1">
            管理用户和分配角色
          </p>
        </Link>
        <Link
          href="/admin/wiki"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">Wiki 总览</h2>
          <p className="text-gray-600 text-sm mt-1">
            浏览所有用户的 Wiki 空间
          </p>
        </Link>
        <Link
          href="/admin/ai"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">Ai 问答管理</h2>
          <p className="text-gray-600 text-sm mt-1">
            配置 AI 模型和 API Key
          </p>
        </Link>
      </div>
    </div>
  );
}

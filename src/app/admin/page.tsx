import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/boards"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">Board Management</h2>
          <p className="text-gray-600 text-sm mt-1">
            Create, edit, and delete forum boards
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">User Management</h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage users and assign roles
          </p>
        </Link>
        <Link
          href="/admin/wiki"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-semibold">Wiki Overview</h2>
          <p className="text-gray-600 text-sm mt-1">
            Browse all user wiki spaces
          </p>
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";
import { SignOutButton } from "./SignOutButton";
import { NavbarAIButton } from "@/components/ai/NavbarAIButton";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <nav className="bg-white shadow border-b">
      <div className="w-full px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-blue-600">
            BBS-Wiki
          </Link>
          {user && (
            <Link
              href="/wiki"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              我的 Wiki
            </Link>
          )}
          <Link
            href="/boards"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            论坛版块
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              管理后台
            </Link>
          )}
          {user && <NavbarAIButton />}

        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold border border-blue-200">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm text-gray-700 font-medium">{user.name}</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

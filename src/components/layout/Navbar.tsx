import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";
import { SignOutButton } from "./SignOutButton";
import { NavbarAIButton } from "@/components/ai/NavbarAIButton";
import { ActiveLink } from "./ActiveLink";

export async function Navbar() {
  const user = await getCurrentUser();

  // 基础导航样式：仅保留公共部分（布局和边框宽度等）
  const navBaseClass = "text-sm flex items-center h-full border-b-2 transition-colors";
  // 选中时的导航样式：主色调划线及字体加粗
  const navActiveClass = "border-b-blue-600 text-blue-600 font-medium";
  // 未选中时的导航样式：透明划线及常规字体颜色
  const navInactiveClass = "border-b-transparent text-gray-600 hover:text-gray-900";

  return (
    <nav className="bg-white shadow border-b">
      <div className="w-full px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 h-full">
          <Link href="/" className="text-xl font-bold text-blue-600 mr-2">
            BBS-Wiki
          </Link>
          {user && (
            <ActiveLink
              href="/wiki"
              className={navBaseClass}
              activeClassName={navActiveClass}
              inactiveClassName={navInactiveClass}
            >
              我的 Wiki
            </ActiveLink>
          )}
          <ActiveLink
            href="/boards"
            className={navBaseClass}
            activeClassName={navActiveClass}
            inactiveClassName={navInactiveClass}
          >
            论坛版块
          </ActiveLink>
          {user?.role === "ADMIN" && (
            <ActiveLink
              href="/admin"
              className={navBaseClass}
              activeClassName={navActiveClass}
              inactiveClassName={navInactiveClass}
            >
              管理后台
            </ActiveLink>
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

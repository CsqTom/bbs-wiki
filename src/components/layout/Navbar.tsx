import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

export async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="bg-white shadow border-b">
      <div className="w-full px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-blue-600">
            BBS-Wiki
          </Link>
          <Link
            href="/boards"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Boards
          </Link>
          {user && (
            <Link
              href="/wiki"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              My Wiki
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-600">{user.name}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

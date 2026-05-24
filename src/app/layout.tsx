import type { Metadata } from "next";
import "./globals.css";
import "@uiw/react-markdown-preview/markdown.css";
import { Navbar } from "@/components/layout/Navbar";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

export const metadata: Metadata = {
  title: "BBS-Wiki",
  description: "Forum + Wiki Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen">
        <ConfirmProvider>
          <Navbar />
          <main className="flex-1 min-h-0 w-full px-4 py-6">{children}</main>
        </ConfirmProvider>
      </body>
    </html>
  );
}

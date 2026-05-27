"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

/**
 * 依赖注入：将具体的 href 和子组件以及样式策略注入进来
 * 这样可以复用该组件到任何需要 active 状态判断的场景
 */
interface ActiveLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  exact?: boolean;
}

export function ActiveLink({
  href,
  children,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  exact = false,
}: ActiveLinkProps) {
  const pathname = usePathname();
  
  // 检查当前路径是否匹配
  // 如果是 exact 模式则要求完全相等，否则只要以该 href 开头即可（用于匹配子路由如 /wiki/xxx）
  const isActive = exact 
    ? pathname === href 
    : pathname.startsWith(href);

  return (
    <Link 
      href={href} 
      className={`${className} ${isActive ? activeClassName : inactiveClassName}`.trim()}
    >
      {children}
    </Link>
  );
}

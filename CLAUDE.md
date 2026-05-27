# CLAUDE.md

本文件为 Claude Code 及其他编码代理提供仓库使用指南。

## 项目概览

该仓库是一个基于 Next.js App Router 构建的、已在运行的 BBS + Wiki 平台。

- 用户拥有私有的 wiki 空间，包含目录树和 Markdown 文章。
- 使用公共或权限控制的版块（Board）进行论坛讨论。
- Wiki 文章可以发布为论坛帖子，也可以生成公开分享链接。
- 当前的 wiki 编辑体验为左侧边栏 + 右侧工作区的布局，支持 Markdown 编辑器、预览和思维导图协作。

## 技术栈

- **框架：** Next.js 16 App Router
- **语言：** TypeScript
- **认证：** NextAuth v5 beta
- **数据库：** PostgreSQL 16，通过 Prisma + `@prisma/adapter-pg`
- **UI：** Tailwind CSS 4
- **Markdown 预览：** `@uiw/react-markdown-preview`
- **Markdown 解析：** `react-markdown`、`remark-gfm`
- **思维导图：** `markmap-plus`
- **包管理器：** `pnpm`

## 当前领域模型

- **User**：普通用户/管理员，拥有 wiki 目录、wiki 文章、分享链接和帖子
- **Board**：论坛版块，可设为公开或权限控制
- **BoardPermission**：用户与版块间的可见性绑定
- **WikiDirectory**：用户私有的目录树
- **WikiArticle**：根目录或子目录下的 Markdown 文章
- **WikiShareLink**：公开分享条目，包含 token 和可选过期时间
- **WikiShareItem**：分享链接下的有序文章集合，用于单篇或多篇文章分享
- **Post**：论坛帖子，当前可从 wiki 文章创建

## 路由地图

- `/` - 首页，展示公开版块
- `/boards` - 版块列表
- `/boards/[boardId]` - 版块详情及帖子列表
- `/wiki` - 当前用户的 wiki 工作区首页
- `/wiki/[...path]` - 目录页或文章编辑页
- `/share/[token]` - 公开的 wiki 分享页，校验过期时间
- `/admin` - 管理后台
- `/admin/boards` - 版块管理
- `/admin/users` - 用户管理
- `/admin/wiki` - Wiki 管理页（占位）

## Wiki 架构

### 工作区布局

- Wiki 区域采用固定双栏工作区。
- 左侧为目录树/文章操作区。
- 右侧为内容工作区。
- 文章编辑页使用分栏布局：左侧为 Markdown 编辑器，右侧为预览或思维导图。

### 编辑与同步规则

- Markdown 文章是唯一数据源。
- 思维导图更新通过明确的提交式交互同步回 Markdown。
- 对现有思维导图节点的编辑采用段替换方式，而非全文档重写。
- 新节点根据父级/兄弟级上下文及推导出的标题级别插入。
- 代码节点使用专用的多行叠加编辑器，保持原始围栏代码块结构。

### 分享链接规则

- 一个分享链接可包含一篇或多篇 wiki 文章。
- 分享链接使用公开 token，而非暴露内部文章 ID。
- 分享链接支持可选过期时间。
- 分享页渲染最新的文章内容，wiki 始终保持为数据源。
- 论坛帖子应复用分享链接，而非复制一套独立的公开渲染模型。

## 数据访问约定

- 优先使用 Server Component 进行数据读取。
- 使用 Route Handler 或 Server Action 进行数据变更。
- 数据库访问仅限服务端。
- 复用 `@/lib/prisma`，而非创建临时的 Prisma 客户端。
- 复用 `@/lib/auth-utils` 进行认证检查。

## 实现说明

- `src/app/wiki/layout.tsx` 负责 wiki 外壳布局和侧边栏数据加载。
- `src/app/wiki/WikiSidebar.tsx` 处理目录树交互、创建、删除及多文章分享。
- `src/app/wiki/WikiArticleEditor.tsx` 处理文章编辑、预览、思维导图及当前文章分享。
- `src/components/wiki/MindMapViewer.tsx` 包含思维导图可视化和 Markdown 同步逻辑。
- `src/app/api/wiki` 包含 wiki CRUD API。
- `src/app/api/wiki/shares/route.ts` 创建公开分享链接。

## 近期产品方向

- 论坛帖子需要支持插入 wiki 分享链接。
- 当帖子打开 wiki 链接时，论坛保持在左侧，wiki 内容显示在右侧。
- 关闭 wiki 链接后，右侧 wiki 面板收起，论坛区域保持为主视图。
- 支持 wiki 协作编辑，用户可以在 wiki 中实时编辑协作文章。
- 支持 AI Q&A 功能，问答权限版块中的问题。可以查看问答来源文章与论坛帖子。

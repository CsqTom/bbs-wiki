# CLAUDE.md

This file provides repository guidance for Claude Code and other coding agents.

## Project Snapshot

This repository is an already running BBS + Wiki platform built with Next.js App Router.

- Users have private wiki spaces with directory trees and Markdown articles.
- Public / permission-controlled boards are used for forum discussions.
- Wiki articles can be published as board posts and can also be turned into public share links.
- The current wiki editing experience is a left sidebar + right workspace layout, with Markdown editor, preview, and mind map collaboration.

## Tech Stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **Auth:** NextAuth v5 beta
- **Database:** PostgreSQL 16 via Prisma + `@prisma/adapter-pg`
- **UI:** Tailwind CSS 4
- **Markdown Preview:** `@uiw/react-markdown-preview`
- **Markdown Parsing:** `react-markdown`, `remark-gfm`
- **Mind Map:** `markmap-plus`
- **Package Manager:** `pnpm`

## Current Domain Models

- **User**: normal user / admin, owns wiki directories, wiki articles, share links, and posts
- **Board**: forum board, can be public or permission controlled
- **BoardPermission**: user-to-board visibility binding
- **WikiDirectory**: user-private directory tree
- **WikiArticle**: Markdown article under root or a directory
- **WikiShareLink**: public share entry with token and optional expiration time
- **WikiShareItem**: ordered article collection under a share link, used for single-article or multi-article sharing
- **Post**: forum post entry, currently can be created from a wiki article

## Route Map

- `/` - homepage, shows public boards
- `/boards` - board list
- `/boards/[boardId]` - board detail and post list
- `/wiki` - current user's wiki workspace landing page
- `/wiki/[...path]` - directory page or article editor page
- `/share/[token]` - public wiki share page, validates expiration time
- `/admin` - admin dashboard
- `/admin/boards` - board management
- `/admin/users` - user management
- `/admin/wiki` - wiki admin page placeholder

## Wiki Architecture

### Workspace Layout

- The wiki area uses a fixed two-pane workspace.
- Left side is the directory tree / article operation area.
- Right side is the content workspace.
- Article editing page uses split panes: Markdown editor on the left, preview or mind map on the right.

### Editing and Sync Rules

- Markdown article is the source of truth.
- Mind map updates sync back to Markdown through explicit submit-style interactions.
- Existing mind map node edits use segment replacement instead of full-document rewrite.
- New nodes are inserted according to parent / sibling context and derived heading level.
- Code nodes use a dedicated multiline overlay editor and keep raw fenced block structure.

### Share Link Rules

- A share link can contain one or many wiki articles.
- Share links use public tokens instead of exposing internal article IDs.
- Share links support optional expiration time.
- Shared pages render the latest article content, so wiki remains the source of truth.
- Forum posts should reuse share links instead of duplicating a separate public rendering model.

## Data Access Conventions

- Prefer Server Components for data reading.
- Use Route Handlers or Server Actions for mutations.
- Keep database access on the server side only.
- Reuse `@/lib/prisma` instead of creating ad hoc Prisma clients.
- Reuse `@/lib/auth-utils` for auth checks.

## Implementation Notes

- `src/app/wiki/layout.tsx` owns the wiki shell layout and sidebar data loading.
- `src/app/wiki/WikiSidebar.tsx` handles directory tree interactions, creation, deletion, and multi-article sharing.
- `src/app/wiki/WikiArticleEditor.tsx` handles article editing, preview, mind map, and current-article sharing.
- `src/components/wiki/MindMapViewer.tsx` contains mind map visualization and Markdown sync logic.
- `src/app/api/wiki` contains wiki CRUD APIs.
- `src/app/api/wiki/shares/route.ts` creates public share links.

## Near-Term Product Direction

- Forum posts need to support inserting wiki share links.
- When a post opens a wiki link, forum stays on the left and wiki content appears on the right.
- After closing the wiki link, the right wiki panel should collapse and the forum area remains primary.
- AI Q&A is still a future capability and not part of the current implementation scope.

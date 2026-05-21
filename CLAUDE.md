# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A forum + wiki platform built with Next.js. Users have private wiki spaces (directory-structured Markdown articles) and can share wiki content as forum posts with sync capability.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Auth:** TBD (NextAuth.js or similar)
- **Database:** TBD (PostgreSQL recommended via Prisma ORM)
- **UI Library:** TBD (Tailwind CSS + shadcn/ui recommended)
- **Markdown:** TBD (for wiki articles)

## Architecture

### Core Domain Models

- **Forum Board** — admin-created sections with role-based view permissions; public boards visible to guests
- **Wiki Space** — each user gets a private wiki with hierarchical directory → Markdown article structure
- **Post** — a wiki directory or single article shared/published to a forum board; supports sync when source wiki content is updated
- **User / Role** — admins manage users and assign board access permissions

### Route Structure (App Router)

- `/` — homepage, list of public boards
- `/boards/[boardId]` — posts within a board
- `/wiki` — current user's private wiki space
- `/wiki/[path...]` — wiki directory or article view/edit
- `/admin` — admin panel (board management, user management)

### Key Design Decisions

- Wiki content is the source of truth; forum posts derived from wiki sync when source changes
- Board permissions are role-based, checked server-side in RSC/server actions
- AI Q&A feature is a future extension, not part of initial scope

## Conventions

- Use App Router (not Pages Router) for all routes
- Server Components by default; `'use client'` only when interactive
- Server Actions for form mutations and data writes
- All database queries go through server-side data access layer (never expose DB directly to client)
- Use TypeScript strict mode
- Path aliases: `@/` maps to `src/`

## Project Status

Project has not been scaffolded yet. Next step: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`

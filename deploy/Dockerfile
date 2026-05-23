FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable
RUN corepack prepare pnpm@10.29.2 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN printf '%s\n' \
  'only-built-dependencies[]=@prisma/engines' \
  'only-built-dependencies[]=esbuild' \
  'only-built-dependencies[]=prisma' \
  'only-built-dependencies[]=sharp' \
  'only-built-dependencies[]=unrs-resolver' \
  > .npmrc
RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY public ./public
COPY src ./src
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs prisma.config.ts ./

RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=50030
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/.next ./.next

EXPOSE 50030

CMD ["pnpm", "start"]

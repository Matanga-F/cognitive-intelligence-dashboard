# ── Stage 1: Build ─────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

# ── Stage 2: Production Runtime ────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 cios && \
    adduser --system --uid 1001 cios

# Copy only what’s needed for runtime
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER cios
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_CIOS_API_URL=http://localhost:8000

CMD ["node", "server.js"]

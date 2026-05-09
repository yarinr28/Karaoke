FROM node:20-alpine AS builder

WORKDIR /app

# Passed from docker-compose build args so the rewrite destination is baked
# into .next/routes-manifest.json with the correct internal Docker hostname.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
# RUN npm ci

COPY . .

# Ensure /app/public exists even if the project has no static assets.
RUN mkdir -p public

# next/font/google downloads Inter at build time (requires internet during docker build).
# At runtime the font is served locally — no CDN requests from users' browsers.
RUN npm run build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "start"]

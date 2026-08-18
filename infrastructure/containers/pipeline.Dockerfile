FROM node:22-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY services/pipeline/package.json ./services/pipeline/package.json
COPY services/knowledge/package.json ./services/knowledge/package.json
COPY services/observability/package.json ./services/observability/package.json
COPY services/reporting/package.json ./services/reporting/package.json
COPY services/storage/package.json ./services/storage/package.json
COPY connectors/package.json ./connectors/package.json
COPY intelligence/package.json ./intelligence/package.json
COPY forecasting/package.json ./forecasting/package.json
COPY agents/package.json ./agents/package.json
COPY normalization/package.json ./normalization/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci

FROM dependencies AS builder

WORKDIR /app
COPY . .
RUN npm run build --workspace @dora/pipeline

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 dora \
    && mkdir -p /app/data/ingested \
    && chown -R dora:nodejs /app

COPY --from=builder --chown=dora:nodejs /app/services/pipeline/dist ./dist
COPY --from=builder --chown=dora:nodejs /app/config ./config

USER dora
CMD ["node", "dist/index.cjs"]
# ProjectWatch API — Node.js + TypeScript (M2 / Docker).
# Build context is the repo root; this Dockerfile targets apps/api.
FROM node:20-slim AS build
WORKDIR /app/apps/api
COPY apps/api/package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.base.json /app/tsconfig.base.json
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/src ./src
RUN npx tsc -p tsconfig.json

FROM node:20-slim AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY apps/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/migrations ./migrations
EXPOSE 4000
CMD ["node", "dist/server.js"]

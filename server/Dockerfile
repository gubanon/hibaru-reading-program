FROM node:20-bookworm-slim

WORKDIR /app

# better-sqlite3 has a native addon that needs to be compiled for this image's
# platform — these build tools are only needed during `npm ci`, then removed
# to keep the runtime image small.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.js"]

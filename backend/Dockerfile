FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci \
  && test -x ./node_modules/.bin/prisma \
  && ./node_modules/.bin/prisma --version

COPY . .
RUN ./node_modules/.bin/prisma generate \
  && npm run build

# Prisma CLI is a devDependency; bundle its lockfile-pinned tree for the runner stage.
RUN mkdir -p /prisma-toolchain/node_modules/.bin \
  && cp -a node_modules/.bin/prisma /prisma-toolchain/node_modules/.bin/prisma \
  && npm ls prisma --all --parseable | while IFS= read -r dir; do \
       rel="${dir#*node_modules/}"; \
       [ -n "$rel" ] || continue; \
       mkdir -p "/prisma-toolchain/node_modules/$(dirname "$rel")"; \
       cp -a "$dir" "/prisma-toolchain/node_modules/$rel"; \
     done \
  && test -x /prisma-toolchain/node_modules/.bin/prisma \
  && /prisma-toolchain/node_modules/.bin/prisma --version

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /prisma-toolchain/node_modules/ ./node_modules/

RUN test -x ./node_modules/.bin/prisma \
  && ./node_modules/.bin/prisma --version \
  && ./node_modules/.bin/prisma generate

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]

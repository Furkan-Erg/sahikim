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
RUN node <<'EOF'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = '/prisma-toolchain/node_modules';
fs.mkdirSync(path.join(out, '.bin'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules/.bin/prisma'),
  path.join(out, '.bin/prisma'),
);

const copied = new Set();

function copyPkg(absPath) {
  const rel = path.relative(path.join(root, 'node_modules'), absPath);
  if (!rel || rel.startsWith('..') || copied.has(rel)) return;
  copied.add(rel);

  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(absPath, dest, { recursive: true });

  const pkgJsonPath = path.join(absPath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };

  for (const dep of Object.keys(deps)) {
    const nested = path.join(absPath, 'node_modules', dep);
    const hoisted = path.join(root, 'node_modules', dep);
    if (fs.existsSync(nested)) copyPkg(nested);
    else if (fs.existsSync(hoisted)) copyPkg(hoisted);
  }
}

copyPkg(path.join(root, 'node_modules/prisma'));
EOF

RUN test -x /prisma-toolchain/node_modules/.bin/prisma \
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

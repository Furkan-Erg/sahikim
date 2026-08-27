# Sahikim

Socket.IO tabanlı çok oyunculu oyun projesi.

## Yerel Geliştirme

### Docker ile

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

### Manuel

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# Frontend (ayrı terminal)
cd frontend
npm install
npm run dev
```

Frontend varsayılan olarak `http://localhost:3000` üzerinden Socket.IO'ya bağlanır (`VITE_SOCKET_URL` ile değiştirilebilir).

## Production Docker Deployment

Sahikim, VPS üzerinde ana Docker Compose ve Nginx ile birlikte çalışacak şekilde yapılandırılmıştır.

### Mimari

```text
Internet → Cloudflare → VPS Nginx
                           ├── game.furkanerg.com/           → sahikim-frontend:5173
                           └── game.furkanerg.com/socket.io/ → sahikim-backend:3000
                                                                    ↓
                                                              sahikim-postgres (internal network)
```

Nginx yapılandırması bu repoda değil; VPS'teki ana compose içinde yönetilir.

### Önkoşullar

1. Repo VPS'e clone edilmiş olmalı:

   ```bash
   git clone <repo-url> ~/server/sahikim
   cd ~/server/sahikim
   ```

2. Ana VPS Docker Compose'unda `web` adlı external network tanımlı olmalı:

   ```yaml
   networks:
     web:
       driver: bridge
   ```

3. Docker ve Docker Compose kurulu olmalı.

### Ortam Değişkenleri

Production secret'ları Git'e eklemeyin. Repoda `.env.example` şablonu vardır:

```bash
cp .env.example .env
# .env dosyasını düzenleyin — en azından POSTGRES_PASSWORD değerini değiştirin
```

| Değişken | Açıklama |
| --- | --- |
| `POSTGRES_PASSWORD` | PostgreSQL şifresi (**zorunlu**) |
| `POSTGRES_USER` | PostgreSQL kullanıcı adı (varsayılan: `sahikim`) |
| `POSTGRES_DB` | Veritabanı adı (varsayılan: `sahikim`) |
| `DATABASE_URL` | Backend Prisma bağlantı dizesi (belirtilmezse compose otomatik oluşturur) |
| `VITE_SOCKET_URL` | Frontend build arg — production Socket.IO URL (varsayılan: `https://game.furkanerg.com`) |
| `CORS_ORIGINS` | İzin verilen origin'ler, virgülle ayrılmış (varsayılan: `https://game.furkanerg.com`) |

### Production Compose Çalıştırma

```bash
cd ~/server/sahikim

# Yapılandırmayı doğrula
docker compose -f docker-compose.prod.yml config

# Image'ları build et
docker compose -f docker-compose.prod.yml build

# Servisleri başlat
docker compose -f docker-compose.prod.yml up -d
```

Production compose:

- Host'a **5432**, **3000** veya **5173** portlarını publish etmez
- PostgreSQL yalnızca `internal` Docker network'ünde backend tarafından erişilebilir
- Frontend ve backend, Nginx'in erişebilmesi için external `web` network'üne bağlanır
- Container isimleri: `sahikim-postgres`, `sahikim-backend`, `sahikim-frontend`

### Nginx Proxy Hedefleri

Ana VPS Nginx yapılandırmasında (bu repoda değil):

| İstek | Hedef |
| --- | --- |
| `game.furkanerg.com/` | `http://sahikim-frontend:5173` |
| `game.furkanerg.com/socket.io/` | `http://sahikim-backend:3000` |

Socket.IO default path (`/socket.io/`) değiştirilmemiştir; frontend `io(VITE_SOCKET_URL)` kullanır.

### Yerel Production Build Testi

External `web` network'ü yerelde yoksa oluşturun:

```bash
docker network create web
```

Ardından production compose'u test edin:

```bash
cp .env.example .env
# POSTGRES_PASSWORD değerini düzenleyin

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up
```

Container'lar host portu açmadığı için tarayıcıdan erişim için Nginx veya `docker exec` gerekir; bu beklenen davranıştır.

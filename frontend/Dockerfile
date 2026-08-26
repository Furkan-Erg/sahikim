FROM node:20-alpine

WORKDIR /app

ARG VITE_SOCKET_URL=http://localhost:3000
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview"]

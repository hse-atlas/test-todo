# Этап сборки
FROM node:18-alpine AS builder
WORKDIR /app

# Кэшируем зависимости
COPY package.json package-lock.json ./
RUN npm ci --silent --only=production --prefer-offline

# Копируем остальное и собираем
COPY . .
RUN npm run build

# Этап запуска
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
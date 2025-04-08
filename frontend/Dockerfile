# Этап сборки
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# Установка только production зависимостей
RUN npm ci --silent --only=production
COPY . .
RUN npm run build

# Этап запуска - используем более легкий nginx
FROM nginx:alpine
# Уменьшаем размер, удаляя ненужные файлы nginx
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
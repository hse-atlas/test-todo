#!/bin/bash

# Переходим в директорию проекта
cd /путь/к/директории/test-todo

# Останавливаем существующие контейнеры, если они есть
docker-compose down

# Собираем и запускаем контейнеры
docker-compose up -d

# Проверяем статус
echo "Статус контейнеров:"
docker-compose ps

echo "Приложение доступно по адресам:"
echo "- Frontend: http://YOUR_SERVER_IP:3001"
echo "- Backend API: http://YOUR_SERVER_IP:8080"
echo "- Swagger Docs: http://YOUR_SERVER_IP:8080/docs"
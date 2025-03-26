#!/bin/bash

# Останавливаем существующие контейнеры, если они есть
docker-compose down

# Собираем и запускаем контейнеры с перестройкой
docker-compose up -d --build

# Проверяем статус
echo "Статус контейнеров:"
docker-compose ps

echo "Приложение доступно по адресам:"
echo "- Frontend: http://$(hostname -I | awk '{print $1}'):3456"
echo "- Backend API: http://$(hostname -I | awk '{print $1}'):8888"
echo "- Swagger Docs: http://$(hostname -I | awk '{print $1}'):8888/docs"
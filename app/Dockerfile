# Этап сборки
FROM python:3.9-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости только для сборки
RUN apk add --no-cache --virtual .build-deps \
    postgresql-dev gcc python3-dev musl-dev

# Копируем только requirements.txt сначала для лучшего кэширования
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --user --no-cache-dir -r requirements.txt

# Удаляем временные зависимости
RUN apk del .build-deps

# Этап запуска
FROM python:3.9-alpine

WORKDIR /app

# Копируем установленные зависимости
COPY --from=builder /root/.local /root/.local

# Копируем весь код приложения
COPY . .

# Очищаем кэш и ненужные файлы
RUN find /usr/local -type d -name '__pycache__' -exec rm -rf {} + \
    && rm -rf /var/cache/apk/*

# Устанавливаем PATH для python
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Запускаем приложение
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888", "--no-access-log"]
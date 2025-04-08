# Этап сборки
FROM python:3.9-alpine AS builder
WORKDIR /app
RUN apk add --no-cache postgresql-dev gcc python3-dev musl-dev
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Этап запуска
FROM python:3.9-alpine
WORKDIR /app
# Копируем только необходимые файлы
COPY --from=builder /root/.local /root/.local
COPY . .

# Убедитесь, что скрипты в PATH
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888", "--no-access-log"]
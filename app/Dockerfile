FROM python:3.9-alpine

WORKDIR /app

# Устанавливаем необходимые зависимости для psycopg2 и другие
RUN apk add --no-cache postgresql-dev gcc python3-dev musl-dev

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888"]
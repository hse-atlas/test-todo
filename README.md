# To-Do List Application

Простое веб-приложение для управления задачами с аутентификацией пользователей.

## Основной функционал

- ✅ Регистрация и авторизация пользователей
- ✅ Создание/редактирование/удаление задач
- ✅ Отметка выполнения задач
- ✅ JWT-аутентификация
- ✅ Адаптивный интерфейс

## Технологии

### Бэкенд

- Python 3.10
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL
- JWT-аутентификация

### Фронтенд

- React 18
- Ant Design
- Axios
- React Router

### Инфраструктура

- Docker
- Docker Compose
- Nginx

## Установка и запуск

1. Клонировать репозиторий:

```bash
git clone https://github.com/hse-atlas/test-todo.git
cd todo-app
```

2. Запустить приложение в Docker:

```bash
docker-compose up --build
```

Приложение будет доступно по адресам:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

## API Endpoints

| Метод  | Эндпоинт        | Описание                  |
| ------ | --------------- | ------------------------- |
| POST   | /api/register   | Регистрация пользователя  |
| POST   | /api/login      | Авторизация               |
| GET    | /api/user/me    | Информация о пользователе |
| GET    | /api/tasks      | Получить список задач     |
| POST   | /api/tasks      | Создать задачу            |
| PUT    | /api/tasks/{id} | Обновить задачу           |
| DELETE | /api/tasks/{id} | Удалить задачу            |

## Использование

1. Зарегистрируйте нового пользователя:

```bash
curl -X POST "http://localhost:8000/api/register" \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "testpass"}'
```

2. Авторизуйтесь:

```bash
curl -X POST "http://localhost:8000/api/login" \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "username=testuser&password=testpass"
```

3. Используйте полученный токен:

```bash
curl -X GET "http://localhost:8000/api/tasks" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Структура проекта

```
todo-app/
├── app/               # Backend
│   ├── main.py        # Основной файл приложения
│   ├── auth.py        # Аутентификация
│   ├── tasks.py       # Логика задач
│   ├── models.py      # SQLAlchemy модели
│   ├── schemas.py     # Pydantic схемы
│   ├── database.py    # Настройки БД
│   └── requirements.txt
│
├── frontend/          # Frontend
│   ├── public/
│   ├── src/
│   │   ├── api/       # API клиент
│   │   ├── components/ # React компоненты
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## Лицензия

MIT License

## Контакты

Автор: Gadji

Email: dandamaev.g@yandex.ru

GitHub: [@dandamaev](https://github.com/Dandamaev)

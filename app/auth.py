# /app/auth.py

import jwt
from fastapi import APIRouter, Depends, HTTPException, status # Убедитесь, что status импортирован
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- ИСПРАВЛЕННЫЕ ИМПОРТЫ ---
# Импортируем напрямую из модулей в той же директории
from database import get_db
from models import User # Импортируем конкретную модель User
import schemas         # Импортируем модуль schemas целиком
# или можно импортировать конкретные схемы:
# from schemas import UserCreate, UserLogin, UserResponse, Task, TaskCreate, TaskUpdate
# -----------------------------

router = APIRouter(tags=["auth"])
security = HTTPBearer()

# Функция get_current_user (без изменений, но убедитесь, что модель User импортирована выше)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        # Декодируем JWT токен без проверки подписи
        # ВНИМАНИЕ: В реальном приложении ЗДЕСЬ НУЖНО ПРОВЕРЯТЬ ПОДПИСЬ И СРОК ДЕЙСТВИЯ!
        # Это просто пример для получения external_user_id из 'sub'
        payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False}) # Добавил verify_exp=False для простоты

        # Извлекаем external_user_id из payload (обычно поле 'sub')
        external_user_id_str = payload.get("sub") # 'sub' обычно строка

        if not external_user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token: 'sub' claim not found") # Изменил код на 401

        # --- ВАЖНОЕ ИЗМЕНЕНИЕ ТИПА ---
        # Модель User ожидает external_user_id как Integer, а JWT 'sub' обычно строка
        # Преобразуем строку в integer
        try:
            external_user_id = int(external_user_id_str)
        except (ValueError, TypeError):
             raise HTTPException(status_code=401, detail="Invalid token: 'sub' claim is not a valid integer")
        # ----------------------------

        # Получаем пользователя по external_user_id (теперь тип совпадает)
        user = db.query(User).filter(User.external_user_id == external_user_id).first()

        if not user:
            # Пользователь с таким external_id не найден в нашей БД (возможно, токен валиден, но юзера нет)
            raise HTTPException(status_code=404, detail="User associated with this token not found in DB") # Более точное сообщение

        return user

    except jwt.ExpiredSignatureError:
         raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as e:
        print(f"JWT Decode Error: {e}") # Логирование ошибки
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e: # Ловим другие возможные ошибки
        print(f"Error in get_current_user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during authentication")


@router.post(
    "/register",
    response_model=schemas.UserResponse, # Используем схему из импортированного модуля
    responses={
        status.HTTP_200_OK: {"description": "User logged in or updated successfully"},
        status.HTTP_201_CREATED: {"description": "User created successfully"},
        status.HTTP_409_CONFLICT: {"description": "Email already registered by another user"},
    }
)
async def register_or_login_oauth_user(
    user_data: schemas.UserCreate, # Используем схему из импортированного модуля
    db: Session = Depends(get_db)
):
    # 1. Ищем пользователя по external_user_id
    # Используем User напрямую, т.к. импортировали его
    existing_user_by_external_id = db.query(User).filter(
        User.external_user_id == user_data.external_user_id
    ).first()

    if existing_user_by_external_id:
        # 2. Пользователь найден по external_id - это ЛОГИН или обновление данных
        print(f"User found by external_id: {user_data.external_user_id}. Updating...")
        existing_user_by_external_id.email = user_data.email
        existing_user_by_external_id.username = user_data.username
        db.commit()
        db.refresh(existing_user_by_external_id)
        return existing_user_by_external_id

    else:
        # 3. Пользователь с таким external_id НЕ найден. Проверяем email.
        print(f"User not found by external_id: {user_data.external_user_id}. Checking email: {user_data.email}")
        # Используем User напрямую
        existing_user_by_email = db.query(User).filter(
            User.email == user_data.email
        ).first()

        if existing_user_by_email:
            # 4. Email уже занят ДРУГИМ пользователем
            print(f"Email {user_data.email} already exists for a different user.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{user_data.email}' is already registered. Please log in with the original method or use a different email.",
            )
        else:
            # 5. Ни external_id, ни email не найдены - это НОВАЯ РЕГИСТРАЦИЯ
            print(f"Creating new user for external_id: {user_data.external_user_id}")
            # Используем User напрямую
            new_user = User(
                external_user_id=user_data.external_user_id,
                username=user_data.username,
                email=user_data.email
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user

# Эндпоинт /login теперь, вероятно, не нужен, если вся аутентификация идет через /register (OAuth)
# Если он все же нужен для какого-то другого потока, оставьте его, но убедитесь, что UserLogin и User импортированы
# @router.post("/login", response_model=schemas.UserResponse)
# async def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
#     user = db.query(User).filter(
#         User.username == login_data.username # Обычно логин по username/email
#     ).first()
#     # Здесь должна быть проверка пароля (если это НЕ OAuth)
#     if not user: # or not verify_password(login_data.password, user.hashed_password):
#         raise HTTPException(
#             status_code=401, # Используем 401 для неверных данных
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     # Генерация токена (если это НЕ OAuth)
#     # ...
#     return user # Обычно возвращают токен, а не пользователя

@router.get("/profile", response_model=schemas.UserResponse) # Возвращаем полную модель пользователя
async def get_profile(current_user: User = Depends(get_current_user)):
    # current_user уже является объектом User из БД благодаря get_current_user
    return current_user


@app.get("/proxy/atlas/user/me")
async def get_atlas_user_profile(request: Request):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(401, "Missing token")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://atlas.appweb.space/api/auth/user/me",
            headers={"Authorization": token}
        )
        return response.json()
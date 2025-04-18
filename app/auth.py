# /app/auth.py

import jwt
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- ИСПРАВЛЕННЫЕ ИМПОРТЫ ---
# Импортируем напрямую из модулей в той же директории
from database import get_db
import models
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


@router.get("/proxy/atlas/user/me", response_model=schemas.AtlasUserResponse)
async def get_atlas_user_profile(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://atlas.appweb.space/api/auth/user/me",
                headers={"Authorization": auth_header},
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Atlas API error: {e.response.text}"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to Atlas API: {str(e)}"
        )

@router.post("/register", response_model=schemas.UserResponse)
async def register_or_login_oauth_user(
    db: Session = Depends(get_db),
    atlas_user: schemas.AtlasUserResponse = Depends(get_atlas_user_profile)
):
    # Преобразуем данные из Atlas в нашу схему UserCreate
    user_data = schemas.UserCreate(
        external_user_id=atlas_user.id,
        username=atlas_user.login,
        email=atlas_user.email
    )

    # Проверяем существующего пользователя по external_user_id
    existing_user = db.query(models.User).filter(
        models.User.external_user_id == user_data.external_user_id
    ).first()

    if existing_user:
        # Обновляем данные существующего пользователя
        existing_user.username = user_data.username
        existing_user.email = user_data.email
        db.commit()
        db.refresh(existing_user)
        return existing_user
    
    # Проверяем email на уникальность
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Создаем нового пользователя
    new_user = models.User(
        external_user_id=user_data.external_user_id,
        username=user_data.username,
        email=user_data.email
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
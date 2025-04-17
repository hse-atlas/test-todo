import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from .. import models, schemas
from schemas import UserCreate, UserLogin, UserResponse  # Импортируем UserCreate и UserLogin
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(tags=["auth"])

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        # Декодируем JWT токен без проверки подписи
        payload = jwt.decode(token, options={"verify_signature": False})

        # Извлекаем external_user_id из payload
        external_user_id = payload.get("sub")

        if not external_user_id:
            raise HTTPException(status_code=400, detail="Invalid token: external_user_id not found")

        # Получаем пользователя по external_user_id
        user = db.query(User).filter(User.external_user_id == external_user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")



@router.post(
    "/register",
    # Можно вернуть UserResponse и для обновления, и для создания
    response_model=schemas.UserResponse,
    # Добавляем статус-коды для документации Swagger/OpenAPI
    responses={
        status.HTTP_200_OK: {"description": "User logged in or updated successfully"},
        status.HTTP_201_CREATED: {"description": "User created successfully"},
        status.HTTP_409_CONFLICT: {"description": "Email already registered by another user"},
    }
)
async def register_or_login_oauth_user(
    user_data: schemas.UserCreate, # Используем user_data как имя переменной
    db: Session = Depends(get_db)
):
    # 1. Ищем пользователя по external_user_id
    existing_user_by_external_id = db.query(models.User).filter(
        models.User.external_user_id == user_data.external_user_id
    ).first()

    if existing_user_by_external_id:
        # 2. Пользователь найден по external_id - это ЛОГИН или обновление данных
        print(f"User found by external_id: {user_data.external_user_id}. Updating...")
        # Обновляем email и username на случай их изменения в Atlas
        existing_user_by_external_id.email = user_data.email
        existing_user_by_external_id.username = user_data.username
        # Дополнительно можно обновлять last_login timestamp и т.д.

        db.commit()
        db.refresh(existing_user_by_external_id)
        # Возвращаем 200 OK, т.к. пользователь уже существовал (логин/обновление)
        # FastAPI автоматически установит код 200, если не указан другой при возврате
        return existing_user_by_external_id

    else:
        # 3. Пользователь с таким external_id НЕ найден. Проверяем email.
        print(f"User not found by external_id: {user_data.external_user_id}. Checking email: {user_data.email}")
        existing_user_by_email = db.query(models.User).filter(
            models.User.email == user_data.email
        ).first()

        if existing_user_by_email:
            # 4. Email уже занят ДРУГИМ пользователем (т.к. external_id не совпал)
            print(f"Email {user_data.email} already exists for a different user.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, # Используем 409 Conflict
                detail=f"Email '{user_data.email}' is already registered. Please log in with the original method or use a different email.",
            )
        else:
            # 5. Ни external_id, ни email не найдены - это НОВАЯ РЕГИСТРАЦИЯ
            print(f"Creating new user for external_id: {user_data.external_user_id}")
            new_user = models.User(
                external_user_id=user_data.external_user_id,
                username=user_data.username,
                email=user_data.email
                # Можно добавить другие поля по умолчанию при создании
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            # Возвращаем 201 Created (хотя FastAPI по умолчанию вернет 200, если модель совпадает)
            # Чтобы явно вернуть 201, можно использовать Response(status_code=201) или настроить декоратор
            # В данном случае возврат модели с кодом 200 тоже приемлем.
            # Если хотите явно 201, можно сделать так в конце:
            # from fastapi import Response
            # return Response(content=schemas.UserResponse.from_orm(new_user).json(), status_code=status.HTTP_201_CREATED, media_type="application/json")
            # Но проще оставить как есть, клиент получит 200 OK и данные.
            return new_user

@router.post("/login", response_model=UserResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.external_user_id == login_data.external_user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {"user": current_user.username}
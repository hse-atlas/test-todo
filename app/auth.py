import jwt
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import Optional

# Импорты из проекта
from database import get_db
import models
import schemas

router = APIRouter(tags=["auth"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --------------------------
# Схемы Pydantic
# --------------------------

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserLocalCreate(UserBase):
    password: str
    password_confirm: str

class UserOAuthCreate(UserBase):
    external_user_id: int
    oauth_provider: str

class AtlasUserResponse(BaseModel):
    id: int
    login: str
    email: EmailStr
    oauth_provider: str

# --------------------------
# Вспомогательные функции
# --------------------------

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, "SECRET_KEY", algorithm="HS256")
    return encoded_jwt

# --------------------------
# Основные эндпоинты
# --------------------------

@router.post("/register/local", response_model=schemas.UserResponse)
async def register_local_user(
    user_data: UserLocalCreate,
    db: Session = Depends(get_db)
):
    # Проверка паролей
    if user_data.password != user_data.password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # Проверка существующего email
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Проверка существующего username
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken"
        )

    # Создание пользователя
    hashed_password = get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        is_oauth=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/register/oauth", response_model=schemas.UserResponse)
async def register_oauth_user(
    user_data: UserOAuthCreate,
    db: Session = Depends(get_db)
):
    # Проверка существующего пользователя по external_id
    existing_user = db.query(models.User).filter(
        models.User.external_user_id == user_data.external_user_id
    ).first()

    if existing_user:
        # Обновляем данные
        existing_user.email = user_data.email
        existing_user.username = user_data.username
        db.commit()
        db.refresh(existing_user)
        return existing_user

    # Проверка email на уникальность
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Создаем нового OAuth пользователя
    new_user = models.User(
        external_user_id=user_data.external_user_id,
        email=user_data.email,
        username=user_data.username,
        oauth_provider=user_data.oauth_provider,
        is_oauth=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/proxy/atlas/user/me", response_model=AtlasUserResponse)
async def get_atlas_user_profile(
    request: Request,
    db: Session = Depends(get_db)
):
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
            atlas_user = response.json()

            # Автоматическая регистрация/логин через OAuth
            user_data = UserOAuthCreate(
                external_user_id=atlas_user["id"],
                email=atlas_user["email"],
                username=atlas_user["login"],
                oauth_provider=atlas_user.get("oauth_provider", "unknown")
            )

            # Используем наш OAuth эндпоинт
            user = await register_oauth_user(user_data, db)

            # Генерируем токен для нашего API
            access_token_expires = timedelta(minutes=30)
            access_token = create_access_token(
                data={"sub": str(user.id)}, expires_delta=access_token_expires
            )
            
            return {
                "id": user.id,
                "login": user.username,
                "email": user.email,
                "oauth_provider": user.oauth_provider,
                "access_token": access_token
            }

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

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, "SECRET_KEY", algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user



import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse  # Импортируем UserCreate и UserLogin
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

ATLAS_API_URL = "https://atlas.appweb.space/api"

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



@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.external_user_id == user.external_user_id) |
        (User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    new_user = User(
        external_user_id=user.external_user_id,
        username=user.username,
        email=user.email
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

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


async def fetch_atlas_user_me(token: str):
    """
    Отправляет запрос к Atlas API для получения данных пользователя.
    """
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{ATLAS_API_URL}/auth/user/me", headers=headers)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error fetching user data from Atlas: {response.text}"
            )
        return response.json()
    
@router.get("/atlas-user")
async def get_atlas_user_data(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Эндпоинт для получения данных пользователя из Atlas API.
    """
    token = credentials.credentials
    user_data = await fetch_atlas_user_me(token)
    return user_data
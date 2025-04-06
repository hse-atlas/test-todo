import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse  # Импортируем UserCreate и UserLogin
from fastapi import Header


router = APIRouter(tags=["auth"])

def get_current_user(token: str, db: Session = Depends(get_db)):
    try:
        # Декодируем JWT токен без проверки подписи
        payload = jwt.decode(token, options={"verify_signature": False})

        # Извлекаем external_user_id из payload
        external_user_id = payload.get("external_user_id")

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
async def get_profile(user: User = Depends(get_current_user)):
    return {"user": user.username}

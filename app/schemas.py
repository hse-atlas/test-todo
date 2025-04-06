from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TaskBase(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    user_id: uuid.UUID  # Обновляем тип

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: EmailStr  # Добавляем email

class UserCreate(BaseModel):
    external_user_id: int  # Обязательный внешний ID
    username: str
    email: EmailStr

class User(UserBase):
    id: uuid.UUID
    is_atlas_user: bool

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    is_atlas_user: bool

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class AtlasUserCreate(BaseModel):
    atlas_user_id: str
    username: str
    email: str
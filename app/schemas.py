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
    user_id: uuid.UUID

    class Config:
        from_attributes = True

class AtlasUserResponse(BaseModel):
    id: int
    login: str
    email: EmailStr
    oauth_provider: str
    project_id: uuid.UUID
    role: str
    status: str

class UserCreate(BaseModel):
    external_user_id: int
    username: str
    email: EmailStr

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    external_user_id: int

    class Config:
        from_attributes = True
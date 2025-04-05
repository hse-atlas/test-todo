from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, UUID
from sqlalchemy.orm import relationship
from database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    # Изменяем id на UUID для совместимости с внешними системами
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    atlas_user_id = Column(String, unique=True, index=True)  # ID из Atlas
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)  # Добавляем email
    hashed_password = Column(String, nullable=True)  # Может быть NULL для Atlas users
    is_atlas_user = Column(Boolean, default=False)  # Флаг Atlas пользователя
    
    tasks = relationship("Task", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    completed = Column(Boolean, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # Обновляем тип
    
    owner = relationship("User", back_populates="tasks")
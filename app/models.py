from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    # Основные поля
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    external_user_id = Column(Integer, unique=True, nullable=False)  # ID из Atlas
    username = Column(String(50), nullable=False)  # Логин из Atlas (login)
    email = Column(String(100), unique=True, nullable=False, index=True)  # Email из Atlas
    
    # Дополнительные поля (опционально)
    oauth_provider = Column(String(20))  # 'google', 'yandex' и т.д.
    status = Column(String(20), default='active')  # Статус из Atlas
    
    # Связи
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100))
    completed = Column(Boolean, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    owner = relationship("User", back_populates="tasks")
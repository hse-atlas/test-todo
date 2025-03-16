from sqlalchemy import create_engine, exc
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import text
import os
import time

# Настройка подключения к БД
DATABASE_URL = os.getenv("DATABASE_URL")

# Конфигурация движка с пулингом соединений
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,
    echo=False  # Включить для отладки SQL-запросов
)

# Настройка сессии
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    """
    Генератор сессий для Dependency Injection в FastAPI
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection(retries: int = 5, delay: int = 3):
    """
    Проверка подключения к базе данных с повторными попытками
    """
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                print("✅ Database connection successful!")
                return True
        except exc.OperationalError as e:
            print(f"⚠️ Connection attempt {attempt}/{retries} failed: {str(e)}")
            if attempt < retries:
                print(f"🕒 Retrying in {delay} seconds...")
                time.sleep(delay)
    raise RuntimeError("❌ Could not connect to the database after multiple attempts")

def create_tables():
    """
    Создание всех таблиц в базе данных
    """
    try:
        print("🛠  Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
    except exc.SQLAlchemyError as e:
        print(f"❌ Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    # Для запуска через командную строку: python database.py
    try:
        check_database_connection()
        create_tables()
    except Exception as e:
        print(f"🔴 Critical error during startup: {str(e)}")
        exit(1)
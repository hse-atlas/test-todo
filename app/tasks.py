from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import User, Task as TaskModel  # Импортируем модель под другим именем
from schemas import TaskCreate, Task, TaskUpdate  # Pydantic схемы
from database import get_db
from auth import get_current_user

router = APIRouter(tags=["tasks"])

@router.post("/tasks", response_model=Task)
async def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        db_task = TaskModel(  # Используем SQLAlchemy модель
            title=task.title,
            completed=task.completed,
            user_id=current_user.id
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        return db_task
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks", response_model=list[Task])
async def read_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tasks = db.query(TaskModel)\
             .filter(TaskModel.user_id == current_user.id)\
             .offset(skip)\
             .limit(limit)\
             .all()
    return tasks

@router.put("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: int,
    task: TaskUpdate,  # Используем новую схему
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(TaskModel)\
               .filter(TaskModel.id == task_id, TaskModel.user_id == current_user.id)\
               .first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(TaskModel)\
               .filter(TaskModel.id == task_id, TaskModel.user_id == current_user.id)\
               .first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}
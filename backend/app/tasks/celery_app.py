from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "jobtrack",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.intel_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    timezone="Asia/Shanghai",
)

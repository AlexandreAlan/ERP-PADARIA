from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.orm import mapped_column, MappedColumn
from app.database import Base  # noqa: F401 – re-exported for convenience


class TimestampMixin:
    created_at: MappedColumn[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: MappedColumn[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class SoftDeleteMixin:
    deleted_at: MappedColumn[datetime | None] = mapped_column(
        DateTime, nullable=True, default=None
    )

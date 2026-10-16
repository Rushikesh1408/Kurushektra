from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import audit, require_roles
from app.core.database import get_db
from app.models import User
from app.models.base import Role
from app.schemas import AdminUserUpdate, Page, UserOut

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_roles(Role.ADMIN)


@router.get("/users", response_model=Page[UserOut])
def list_users(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
               db: Session = Depends(get_db), _: User = Depends(admin_only)):
    total = db.scalar(select(func.count(User.id))) or 0
    rows = db.scalars(select(User).order_by(User.created_at).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[UserOut.model_validate(u) for u in rows], total=total, page=page, page_size=page_size)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(request: Request, user_id: str, body: AdminUserUpdate,
                db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(404, "User not found.")
    if target.id == admin.id:
        raise HTTPException(400, "You can't change your own role or active status.")
    changes = body.model_dump(exclude_unset=True)
    before = {k: getattr(target, k).value if k == "role" else getattr(target, k) for k in changes}
    for k, v in changes.items():
        setattr(target, k, v)
    after = {k: v.value if isinstance(v, Role) else v for k, v in changes.items()}
    audit(db, request, admin, "admin.user_update", "user", target.id, {"before": before, "after": after})
    db.commit()
    return target

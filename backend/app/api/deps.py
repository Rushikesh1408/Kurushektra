from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import AuditLog, User
from app.models.base import Role

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    unauthorized = HTTPException(401, "Not authenticated.", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    user_id = decode_access_token(creds.credentials)
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        raise unauthorized
    return user  # role is read from the database on every request, never trusted from the token


def require_roles(*roles: Role):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You don't have permission to do that.")
        return user

    return checker


def audit(db: Session, request: Request, actor: User | None, action: str, target_type: str | None = None,
          target_id: str | None = None, details: dict | None = None) -> None:
    db.add(AuditLog(
        actor_id=actor.id if actor else None, action=action, target_type=target_type, target_id=target_id,
        ip_address=request.client.host if request.client else None, details=details,
    ))

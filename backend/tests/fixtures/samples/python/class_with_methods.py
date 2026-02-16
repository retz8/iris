"""User account management service."""

from datetime import datetime
from hashlib import sha256


class UserAccount:
    """Manages user account lifecycle."""

    def __init__(self, username, email):
        self.username = username
        self.email = email
        self.created_at = datetime.utcnow()
        self.is_active = True
        self._password_hash = None
        self._login_attempts = 0

    def set_password(self, password):
        salt = self.username.encode()
        self._password_hash = sha256(salt + password.encode()).hexdigest()

    def verify_password(self, password):
        salt = self.username.encode()
        attempt = sha256(salt + password.encode()).hexdigest()
        if attempt == self._password_hash:
            self._login_attempts = 0
            return True
        self._login_attempts += 1
        if self._login_attempts >= 5:
            self.lock_account()
        return False

    def lock_account(self):
        self.is_active = False

    def unlock_account(self):
        self.is_active = True
        self._login_attempts = 0

    def update_email(self, new_email):
        if "@" not in new_email:
            raise ValueError("Invalid email address")
        self.email = new_email

    def to_dict(self):
        return {
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "is_active": self.is_active,
        }

    @classmethod
    def from_dict(cls, data):
        user = cls(data["username"], data["email"])
        user.is_active = data.get("is_active", True)
        return user


class UserRepository:
    """In-memory storage for user accounts."""

    def __init__(self):
        self._users = {}

    def save(self, user):
        self._users[user.username] = user

    def find_by_username(self, username):
        return self._users.get(username)

    def find_by_email(self, email):
        for user in self._users.values():
            if user.email == email:
                return user
        return None

    def delete(self, username):
        return self._users.pop(username, None)

    def list_active(self):
        return [u for u in self._users.values() if u.is_active]

    def count(self):
        return len(self._users)

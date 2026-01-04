"""
Sample FastAPI application for Manual Testing
Expected noise: imports, error handling, logging, guard clauses
Expected clear: core business logic, data models, API routes
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="User API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class User(BaseModel):
    id: int
    name: str
    email: EmailStr
    age: int
    is_active: bool = True
    created_at: datetime
    
    @validator('age')
    def validate_age(cls, v):
        if v < 0 or v > 150:
            raise ValueError('Age must be between 0 and 150')
        return v

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    age: int

class Post(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime

# Mock database
USERS_DB = {}
POSTS_DB = {}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "User API", "version": "1.0.0"}

@app.get("/users", response_model=List[User])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    is_active: Optional[bool] = None
):
    """List all users with pagination"""
    try:
        logger.info(f"Listing users: skip={skip}, limit={limit}")
        
        users = list(USERS_DB.values())
        
        if is_active is not None:
            users = [u for u in users if u.is_active == is_active]
        
        result = users[skip : skip + limit]
        logger.info(f"Returning {len(result)} users")
        return result
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """Get a specific user by ID"""
    try:
        logger.info(f"Fetching user {user_id}")
        
        if user_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        user = USERS_DB.get(user_id)
        
        if user is None:
            logger.warning(f"User {user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/users", response_model=User, status_code=201)
async def create_user(user_data: UserCreate):
    """Create a new user"""
    try:
        logger.info(f"Creating user: {user_data.email}")
        
        # Check if email already exists
        for user in USERS_DB.values():
            if user.email == user_data.email:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        # Create new user
        new_id = len(USERS_DB) + 1
        new_user = User(
            id=new_id,
            name=user_data.name,
            email=user_data.email,
            age=user_data.age,
            created_at=datetime.now()
        )
        
        USERS_DB[new_id] = new_user
        logger.info(f"User created with ID {new_id}")
        return new_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/users/{user_id}/posts", response_model=List[Post])
async def get_user_posts(user_id: int):
    """Get all posts by a user"""
    try:
        logger.info(f"Fetching posts for user {user_id}")
        
        if user_id not in USERS_DB:
            raise HTTPException(status_code=404, detail="User not found")
        
        posts = [p for p in POSTS_DB.values() if p.user_id == user_id]
        logger.info(f"Found {len(posts)} posts for user {user_id}")
        return posts
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching posts for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int):
    """Delete a user"""
    try:
        logger.info(f"Deleting user {user_id}")
        
        if user_id not in USERS_DB:
            raise HTTPException(status_code=404, detail="User not found")
        
        del USERS_DB[user_id]
        logger.info(f"User {user_id} deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)

from datetime import datetime, timezone, timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.s3 import S3Service
from app.user.dependencies import get_current_user, get_current_user_profile
from app.models import User
from app.models.user import (
    RefreshTokenModel,
    UserProfileModel,
)
from app.schemas.user import (
    LoginRequest,
    UserCreate,
    UserResponse,
    TokenLoginResponseSchema,
    TokenRefreshRequestSchema,
    UserProfileResponse,
    UserProfileCreate,
    PasswordResetResponse,
    PasswordChangeSchema,
    UserProfileUpdate,
)
from app.user.security import (
    create_access_token,
    verify_password,
    generate_secure_token,
)
from app.core.config import settings
from app.db.session import get_db
from app.user.validators import validate_passwords_different

router = APIRouter(prefix="/user", tags=["User"])
s3_service = S3Service()


async def _validate_token_not_expired(
    token_obj,
    session: AsyncSession,
    error_detail: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> None:
    if token_obj.expires_at < datetime.now(timezone.utc):
        await session.delete(token_obj)
        await session.commit()
        raise HTTPException(status_code=status_code, detail=error_detail)


async def _build_profile_response(profile: UserProfileModel) -> UserProfileResponse:
    avatar_url = None
    if profile.avatar:
        avatar_url = await s3_service.generate_presigned_url(profile.avatar)
    response = UserProfileResponse.model_validate(profile)
    response.avatar_url = avatar_url
    return response


@router.post(
    "/register",
    response_model=TokenLoginResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Register a new user. Account is activated immediately.",
)
async def register(user_data: UserCreate, session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    new_user = User(email=str(user_data.email))
    new_user.password = user_data.password
    new_user.is_active = True

    session.add(new_user)
    await session.flush()  # get new_user.id before creating refresh token

    access_token = create_access_token(user_id=new_user.id)
    refresh_token_value = generate_secure_token()
    refresh_token = RefreshTokenModel(
        user_id=new_user.id,
        token=refresh_token_value,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    session.add(refresh_token)
    await session.commit()

    return TokenLoginResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token_value,
    )


@router.post(
    "/login",
    response_model=TokenLoginResponseSchema,
    summary="Login",
    description="Login and receive access token. Refresh token is issued together.",
)
async def login(credentials: LoginRequest, session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )

    access_token = create_access_token(user_id=user.id)
    refresh_token_value = generate_secure_token()
    refresh_token = RefreshTokenModel(
        user_id=user.id,
        token=refresh_token_value,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    session.add(refresh_token)
    await session.commit()

    return TokenLoginResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token_value,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get information about currently authenticated user",
)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user



@router.post(
    "/refresh",
    response_model=TokenLoginResponseSchema,
    summary="Refresh access token",
    description="Rotate refresh token and issue a new access token",
)
async def refresh_access_token(
    data: TokenRefreshRequestSchema,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(RefreshTokenModel)
        .where(RefreshTokenModel.token == data.refresh_token)
        .options(selectinload(RefreshTokenModel.user))
    )
    refresh_token = result.scalar_one_or_none()

    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    await _validate_token_not_expired(
        refresh_token,
        session,
        "Refresh token expired",
        status_code=status.HTTP_401_UNAUTHORIZED,
    )

    user = refresh_token.user

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    await session.delete(refresh_token)

    new_refresh_value = generate_secure_token()
    new_refresh = RefreshTokenModel(
        user_id=user.id,
        token=new_refresh_value,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    session.add(new_refresh)

    new_access_token = create_access_token(user_id=user.id)
    await session.commit()

    return TokenLoginResponseSchema(
        access_token=new_access_token,
        refresh_token=new_refresh_value,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout",
    description="Logout current user and revoke all refresh tokens",
)
async def logout(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    await session.execute(
        delete(RefreshTokenModel).where(RefreshTokenModel.user_id == current_user.id)
    )
    await session.commit()



@router.post(
    "/password-change",
    response_model=PasswordResetResponse,
    status_code=status.HTTP_200_OK,
    summary="Change password",
    description="Change password for authenticated user",
)
async def change_password(
    data: PasswordChangeSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if not current_user.verify_password(data.current_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    try:
        validate_passwords_different(
            new_password=data.new_password,
            old_password=None,
            hashed_old_password=current_user.hashed_password,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    current_user.password = data.new_password

    await session.execute(
        delete(RefreshTokenModel).where(RefreshTokenModel.user_id == current_user.id)
    )
    await session.commit()

    return PasswordResetResponse(detail="Password successfully changed")


@router.post(
    "/profile/create",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_profile(
    profile_data: UserProfileCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    existing = await session.execute(
        select(UserProfileModel).where(UserProfileModel.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Profile already exists"
        )

    new_profile = UserProfileModel(user_id=user.id, **profile_data.model_dump())
    session.add(new_profile)

    try:
        await session.commit()
        await session.refresh(new_profile)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Error creating profile")

    return new_profile


@router.get("/profile", response_model=UserProfileResponse)
async def get_my_profile(profile: UserProfileModel = Depends(get_current_user_profile)):
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please create one first.",
        )
    return await _build_profile_response(profile)


@router.patch("/profile", response_model=UserProfileResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    profile: UserProfileModel = Depends(get_current_user_profile),
    session: AsyncSession = Depends(get_db),
):
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create profile before updating.",
        )

    update_data = profile_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )

    for field, value in update_data.items():
        setattr(profile, field, value)

    await session.commit()
    await session.refresh(profile)

    return await _build_profile_response(profile)

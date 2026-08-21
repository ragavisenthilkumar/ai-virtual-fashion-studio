from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, EmailStr, Field

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    DateTime
)

from sqlalchemy.orm import (
    declarative_base,
    sessionmaker,
    Session
)

from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv

from datetime import datetime, timedelta
from pathlib import Path
from PIL import Image, ImageOps
from io import BytesIO
from email.message import EmailMessage

import os
import smtplib
import secrets
import shutil
import uuid
import asyncio
import re

from gradio_client import Client, handle_file

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "60"
    )
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

SMTP_HOST = os.getenv("SMTP_HOST")

SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587"
    )
)

SMTP_USERNAME = os.getenv("SMTP_USERNAME")

SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

SMTP_FROM = os.getenv(
    "SMTP_FROM",
    SMTP_USERNAME
)

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is missing from .env"
    )


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="AI Virtual Fashion Studio",
    description="AI Virtual Try-On using IDM-VTON",
    version="3.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"

USER_DIR = UPLOAD_DIR / "users"
GARMENT_DIR = UPLOAD_DIR / "garments"
RESULT_DIR = UPLOAD_DIR / "results"
PROCESSED_DIR = UPLOAD_DIR / "processed"

USER_DIR.mkdir(parents=True, exist_ok=True)
GARMENT_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# AUTHENTICATION DATABASE
# ============================================================

DATABASE_URL = f"sqlite:///{BASE_DIR / 'users.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# ============================================================
# USER MODEL
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    reset_token = Column(
        String,
        unique=True,
        nullable=True
    )

    reset_token_expires = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


Base.metadata.create_all(bind=engine)


# ============================================================
# PASSWORD SECURITY
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ============================================================
# DATABASE SESSION
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# REQUEST MODELS
# ============================================================

class SignupRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        min_length=6,
        max_length=128
    )


class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=128
    )


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str

    new_password: str = Field(
        min_length=6,
        max_length=128
    )


# ============================================================
# EMAIL FUNCTION
# ============================================================

def send_reset_email(
    recipient_email: str,
    reset_token: str
):
    reset_link = (
        f"{FRONTEND_URL}"
        f"/?reset-token={reset_token}"
    )

    message = EmailMessage()

    message["Subject"] = (
        "Reset your AI Virtual Fashion Studio password"
    )

    message["From"] = SMTP_FROM
    message["To"] = recipient_email

    message.set_content(
        f"""Hello,

We received a request to reset your password.

Click the link below to create a new password:

{reset_link}

This link will expire in 30 minutes.

If you did not request this password reset, you can ignore this email.

AI Virtual Fashion Studio
"""
    )

    with smtplib.SMTP(
        SMTP_HOST,
        SMTP_PORT
    ) as server:

        server.starttls()

        server.login(
            SMTP_USERNAME,
            SMTP_PASSWORD
        )

        server.send_message(message)


# ============================================================
# STATIC FILES
# ============================================================

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


# ============================================================
# IDM-VTON
# ============================================================

IDM_VTON_SPACE = "yisol/IDM-VTON"


# ============================================================
# IMAGE SETTINGS
# ============================================================

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

MAX_FILE_SIZE = 10 * 1024 * 1024

MIN_IMAGE_WIDTH = 256
MIN_IMAGE_HEIGHT = 256

MAX_IMAGE_SIZE = 1600

JPEG_QUALITY = 95


# ============================================================
# GARMENT KEYWORDS
# ============================================================

GARMENT_KEYWORDS = {

    "shirt": [
        "shirt",
        "shirts",
        "formal-shirt",
        "formalshirt",
        "button-shirt",
        "buttonshirt"
    ],

    "t-shirt": [
        "tshirt",
        "t-shirt",
        "tee",
        "tshirt"
    ],

    "top": [
        "top",
        "tops",
        "blouse",
        "crop-top",
        "croptop",
        "tank"
    ],

    "dress": [
        "dress",
        "gown",
        "frock",
        "maxi"
    ],

    "jacket": [
        "jacket",
        "coat",
        "blazer",
        "hoodie",
        "sweatshirt"
    ],

    "sweater": [
        "sweater",
        "pullover",
        "cardigan",
        "knit"
    ],

    "kurti": [
        "kurti",
        "kurta",
        "kurtis"
    ]
}


# ============================================================
# SAFE FILENAME
# ============================================================

def safe_filename(filename: str) -> str:

    filename = Path(filename).name

    filename = re.sub(
        r"[^a-zA-Z0-9._-]",
        "_",
        filename
    )

    return filename


# ============================================================
# IMAGE VALIDATION
# ============================================================

def check_image_filename(filename: str):

    if not filename:

        raise HTTPException(
            status_code=400,
            detail="Image filename is missing."
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG or WEBP."
            )
        )

    return extension


# ============================================================
# READ IMAGE
# ============================================================

async def read_uploaded_image(
    file: UploadFile
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="Image filename is missing."
        )

    check_image_filename(
        file.filename
    )

    if (
        file.content_type
        and file.content_type not in ALLOWED_CONTENT_TYPES
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid content type. "
                "Please upload JPG, PNG or WEBP."
            )
        )

    try:

        data = await file.read()

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Could not read uploaded image: {str(e)}"
        )

    if not data:

        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    if len(data) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=400,
            detail=(
                "Image is too large. "
                "Maximum allowed size is 10 MB."
            )
        )

    try:

        image = Image.open(
            BytesIO(data)
        )

        image.verify()

        image = Image.open(
            BytesIO(data)
        )

    except Exception:

        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file is not a valid image."
            )
        )

    return image


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(
    image: Image.Image,
    output_path: Path
):

    try:

        # ----------------------------------------------------
        # Correct phone-camera EXIF rotation
        # ----------------------------------------------------

        image = ImageOps.exif_transpose(
            image
        )

        # ----------------------------------------------------
        # Convert transparency to RGB
        # ----------------------------------------------------

        if image.mode in (
            "RGBA",
            "LA"
        ):

            background = Image.new(
                "RGB",
                image.size,
                "white"
            )

            if image.mode == "RGBA":

                background.paste(
                    image,
                    mask=image.getchannel("A")
                )

            else:

                background.paste(
                    image,
                    mask=image.getchannel("A")
                )

            image = background

        else:

            image = image.convert(
                "RGB"
            )

        # ----------------------------------------------------
        # Validate dimensions
        # ----------------------------------------------------

        width, height = image.size

        if (
            width < MIN_IMAGE_WIDTH
            or height < MIN_IMAGE_HEIGHT
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Image is too small. "
                    f"Minimum size is "
                    f"{MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}px."
                )
            )

        # ----------------------------------------------------
        # Resize very large images
        # ----------------------------------------------------

        if (
            width > MAX_IMAGE_SIZE
            or height > MAX_IMAGE_SIZE
        ):

            image.thumbnail(
                (
                    MAX_IMAGE_SIZE,
                    MAX_IMAGE_SIZE
                ),
                Image.Resampling.LANCZOS
            )

        # ----------------------------------------------------
        # Save normalized image
        # ----------------------------------------------------

        image.save(
            output_path,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True
        )

        return image

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Image preprocessing failed: "
                f"{str(e)}"
            )
        )


# ============================================================
# SAVE PREPROCESSED IMAGE
# ============================================================

async def save_processed_image(
    file: UploadFile,
    directory: Path,
    prefix: str
):

    image = await read_uploaded_image(
        file
    )

    unique_id = uuid.uuid4().hex

    filename = (
        f"{prefix}_{unique_id}.jpg"
    )

    output_path = directory / filename

    preprocess_image(
        image,
        output_path
    )

    return filename, output_path


# ============================================================
# GARMENT CATEGORY DETECTION
# ============================================================

def detect_garment_category(
    filename: str,
    image: Image.Image
):

    original_name = (
        Path(filename)
        .stem
        .lower()
    )

    normalized_name = (
        original_name
        .replace("_", "-")
        .replace(" ", "-")
    )

    # --------------------------------------------------------
    # First: filename keywords
    # --------------------------------------------------------

    for category, keywords in GARMENT_KEYWORDS.items():

        for keyword in keywords:

            if keyword in normalized_name:

                return category

    # --------------------------------------------------------
    # Second: simple image-shape heuristic
    #
    # This is intentionally lightweight.
    # IDM-VTON remains the actual AI model.
    # --------------------------------------------------------

    width, height = image.size

    ratio = height / max(width, 1)

    if ratio > 1.75:

        return "dress"

    if ratio > 1.35:

        return "top"

    if ratio < 0.85:

        return "jacket"

    return "shirt"


# ============================================================
# GARMENT DESCRIPTION
# ============================================================

def build_garment_description(
    category: str
):

    descriptions = {

        "shirt":
            "a shirt",

        "t-shirt":
            "a casual t-shirt",

        "top":
            "a fashion top",

        "dress":
            "a dress",

        "jacket":
            "a jacket",

        "sweater":
            "a sweater",

        "kurti":
            "a kurti"
    }

    return descriptions.get(
        category,
        "the uploaded garment"
    )


# ============================================================
# PERSON IMAGE VALIDATION
# ============================================================

def validate_person_image(
    image: Image.Image
):

    width, height = image.size

    if width < MIN_IMAGE_WIDTH:

        raise HTTPException(
            status_code=400,
            detail=(
                "Person image is too narrow. "
                "Please upload a clearer full-body image."
            )
        )

    if height < MIN_IMAGE_HEIGHT:

        raise HTTPException(
            status_code=400,
            detail=(
                "Person image is too short. "
                "Please upload a clearer image."
            )
        )

    # A try-on model works best with portrait images.
    ratio = height / max(width, 1)

    if ratio < 0.9:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a portrait-oriented "
                "person image."
            )
        )

# ============================================================
# SIGNUP
# ============================================================

@app.post("/signup")
async def signup(
    data: SignupRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    new_user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": "Account created successfully.",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
async def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    access_token = jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "exp": (
                datetime.utcnow()
                + timedelta(
                    minutes=ACCESS_TOKEN_EXPIRE_MINUTES
                )
            )
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "success": True,
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    # Same response whether the email exists or not.
    response = {
        "success": True,
        "message": (
            "If an account exists with this email, "
            "a password reset link has been sent."
        )
    }

    if not user:
        return response

    reset_token = secrets.token_urlsafe(48)

    user.reset_token = reset_token
    user.reset_token_expires = (
        datetime.utcnow()
        + timedelta(minutes=30)
    )

    db.commit()

    try:
        send_reset_email(
            user.email,
            reset_token
        )

    except Exception as e:
        print(
            "PASSWORD RESET EMAIL ERROR:",
            repr(e)
        )

        user.reset_token = None
        user.reset_token_expires = None
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to send password reset email. "
                "Check your SMTP settings."
            )
        )

    return response


# ============================================================
# RESET PASSWORD
# ============================================================

@app.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.reset_token == data.token
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or already used reset link."
        )

    if (
        not user.reset_token_expires
        or user.reset_token_expires < datetime.utcnow()
    ):
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="This reset link has expired."
        )

    user.password_hash = hash_password(
        data.new_password
    )

    # Make the token unusable after resetting.
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {
        "success": True,
        "message": "Password reset successfully. You can now log in."
    }
# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {

        "message":
            "AI Virtual Fashion Studio API is running!",

        "status":
            "success",

        "model":
            "IDM-VTON",

        "space":
            IDM_VTON_SPACE,

        "version":
            "3.0.0",

        "features": [

            "Automatic image preprocessing",

            "EXIF rotation correction",

            "Image validation",

            "Garment category detection",

            "Automatic garment description",

            "Improved IDM-VTON settings"
        ],

        "docs":
            "/docs"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():

    return {

        "status":
            "healthy",

        "backend":
            "FastAPI",

        "ai_model":
            "IDM-VTON",

        "model_space":
            IDM_VTON_SPACE
    }


# ============================================================
# UPLOAD USER IMAGE
# ============================================================

@app.post("/upload-user")
async def upload_user_image(
    file: UploadFile = File(...)
):

    filename, file_path = (
        await save_processed_image(
            file,
            USER_DIR,
            "user"
        )
    )

    return {

        "success":
            True,

        "message":
            "User image uploaded and preprocessed successfully.",

        "filename":
            filename,

        "image_url":
            f"/uploads/users/{filename}"
    }


# ============================================================
# UPLOAD GARMENT IMAGE
# ============================================================

@app.post("/upload-garment")
async def upload_garment_image(
    file: UploadFile = File(...)
):

    image = await read_uploaded_image(
        file
    )

    category = detect_garment_category(
        file.filename,
        image
    )

    description = build_garment_description(
        category
    )

    filename = (
        f"garment_{uuid.uuid4().hex}.jpg"
    )

    output_path = (
        GARMENT_DIR / filename
    )

    preprocess_image(
        image,
        output_path
    )

    return {

        "success":
            True,

        "message":
            "Garment image uploaded and preprocessed successfully.",

        "filename":
            filename,

        "category":
            category,

        "description":
            description,

        "image_url":
            f"/uploads/garments/{filename}"
    }


# ============================================================
# VIRTUAL TRY-ON
# ============================================================

@app.post("/try-on")
async def virtual_try_on(

    user_image: UploadFile = File(...),

    garment_image: UploadFile = File(...)
):

    print()
    print("=" * 70)
    print("AI VIRTUAL FASHION STUDIO")
    print("IDM-VTON VIRTUAL TRY-ON")
    print("=" * 70)


    # ========================================================
    # READ USER IMAGE
    # ========================================================

    user_original = await read_uploaded_image(
        user_image
    )

    validate_person_image(
        user_original
    )


    # ========================================================
    # READ GARMENT IMAGE
    # ========================================================

    garment_original = await read_uploaded_image(
        garment_image
    )


    # ========================================================
    # DETECT GARMENT
    # ========================================================

    garment_category = detect_garment_category(
        garment_image.filename,
        garment_original
    )

    garment_description = build_garment_description(
        garment_category
    )


    print(
        "Detected garment category:",
        garment_category
    )

    print(
        "Garment description:",
        garment_description
    )


    # ========================================================
    # PREPROCESS USER IMAGE
    # ========================================================

    user_filename = (
        f"user_{uuid.uuid4().hex}.jpg"
    )

    user_path = (
        USER_DIR / user_filename
    )

    preprocess_image(
        user_original,
        user_path
    )


    # ========================================================
    # PREPROCESS GARMENT IMAGE
    # ========================================================

    garment_filename = (
        f"garment_{uuid.uuid4().hex}.jpg"
    )

    garment_path = (
        GARMENT_DIR / garment_filename
    )

    preprocess_image(
        garment_original,
        garment_path
    )


    print(
        "User image:",
        user_filename
    )

    print(
        "Garment image:",
        garment_filename
    )


    try:

        # ====================================================
        # CONNECT TO IDM-VTON
        # ====================================================

        print()
        print(
            "Connecting to IDM-VTON..."
        )

        client = Client(
            IDM_VTON_SPACE,
            hf_token=HF_TOKEN
        )

        print(
            "Connected successfully."
        )


        # ====================================================
        # PERSON IMAGE FORMAT
        # ====================================================

        human_image = {

            "background":
                handle_file(
                    str(user_path)
                ),

            "layers":
                [],

            "composite":
                None
        }


        # ====================================================
        # GENERATION SETTINGS
        # ====================================================

        # Higher denoising generally gives IDM-VTON
        # more refinement steps.
        #
        # 30 is the standard baseline.
        # 40 is used here for a slightly more refined result.

        denoise_steps = 40

        # Fixed seed makes testing reproducible.
        # Change this value for different variations.

        seed = 42


        print()
        print(
            "Generation settings:"
        )

        print(
            "Denoise steps:",
            denoise_steps
        )

        print(
            "Seed:",
            seed
        )

        print(
            "Garment:",
            garment_description
        )


        # ====================================================
        # IDM-VTON REQUEST
        # ====================================================

        print()
        print(
            "Sending images to IDM-VTON..."
        )

        print(
            "Generating virtual try-on..."
        )


        result = await asyncio.to_thread(

            client.predict,

            dict=human_image,

            garm_img=handle_file(
                str(garment_path)
            ),

            garment_des=garment_description,

            # Enable model checking
            is_checked=True,

            # Allow IDM-VTON to perform its
            # internal crop processing
            is_checked_crop=True,

            # More refinement
            denoise_steps=denoise_steps,

            # Reproducible generation
            seed=seed,

            api_name="/tryon"
        )


        print()
        print(
            "IDM-VTON response received."
        )


        # ====================================================
        # CHECK RESPONSE
        # ====================================================

        if not result:

            raise HTTPException(
                status_code=500,
                detail=(
                    "IDM-VTON returned an empty response."
                )
            )


        if not isinstance(
            result,
            (list, tuple)
        ):

            raise HTTPException(
                status_code=500,
                detail=(
                    "Unexpected IDM-VTON response format."
                )
            )


        if len(result) == 0:

            raise HTTPException(
                status_code=500,
                detail=(
                    "IDM-VTON returned no generated image."
                )
            )


        # ====================================================
        # GET GENERATED IMAGE
        # ====================================================

        generated_result = result[0]


        if isinstance(
            generated_result,
            str
        ):

            generated_path = Path(
                generated_result
            )

        elif isinstance(
            generated_result,
            dict
        ):

            generated_path = Path(
                generated_result.get(
                    "path",
                    ""
                )
            )

        else:

            raise HTTPException(
                status_code=500,
                detail=(
                    "IDM-VTON returned an unsupported "
                    "image format."
                )
            )


        # ====================================================
        # VERIFY RESULT
        # ====================================================

        if not generated_path:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Generated image path is empty."
                )
            )


        if not generated_path.exists():

            raise HTTPException(
                status_code=500,
                detail=(
                    "IDM-VTON generated a response, "
                    "but the output image could not be found."
                )
            )


        # ====================================================
        # COPY RESULT
        # ====================================================

        result_filename = (
            f"tryon_{uuid.uuid4().hex}.png"
        )

        result_path = (
            RESULT_DIR /
            result_filename
        )


        shutil.copy2(
            generated_path,
            result_path
        )


        # ====================================================
        # RESULT URL
        # ====================================================

        result_url = (
            f"/uploads/results/"
            f"{result_filename}"
        )


        print()
        print("=" * 70)
        print("IDM-VTON COMPLETED SUCCESSFULLY")
        print("=" * 70)

        print(
            "Garment category:",
            garment_category
        )

        print(
            "Garment description:",
            garment_description
        )

        print(
            "Result:",
            result_url
        )

        print("=" * 70)


        # ====================================================
        # RETURN RESPONSE
        # ====================================================

        return {

            "success":
                True,

            "status":
                "completed",

            "message":
                "Virtual try-on generated successfully.",

            "model":
                "IDM-VTON",

            "garment": {

                "category":
                    garment_category,

                "description":
                    garment_description
            },

            "user_image": {

                "filename":
                    user_filename,

                "url":
                    f"/uploads/users/{user_filename}"
            },

            "garment_image": {

                "filename":
                    garment_filename,

                "url":
                    f"/uploads/garments/{garment_filename}"
            },

            "result": {

                "filename":
                    result_filename,

                "url":
                    result_url,

                "download_url":
                    result_url
            }
        }


    except HTTPException:

        raise


    except Exception as e:

        print()
        print("=" * 70)
        print("IDM-VTON ERROR")
        print("=" * 70)

        print(
            repr(e)
        )

        print("=" * 70)


        raise HTTPException(
            status_code=500,
            detail=(
                "IDM-VTON virtual try-on failed. "
                f"{str(e)}"
            )
        )


# ============================================================
# GET USER IMAGE
# ============================================================

@app.get("/user-image/{filename}")
async def get_user_image(
    filename: str
):

    file_path = (
        USER_DIR /
        Path(filename).name
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="User image not found."
        )

    return {

        "success":
            True,

        "url":
            f"/uploads/users/{file_path.name}"
    }


# ============================================================
# GET GARMENT IMAGE
# ============================================================

@app.get("/garment-image/{filename}")
async def get_garment_image(
    filename: str
):

    file_path = (
        GARMENT_DIR /
        Path(filename).name
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Garment image not found."
        )

    return {

        "success":
            True,

        "url":
            f"/uploads/garments/{file_path.name}"
    }


# ============================================================
# GET RESULT
# ============================================================

@app.get("/result/{filename}")
async def get_result(
    filename: str
):

    file_path = (
        RESULT_DIR /
        Path(filename).name
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Try-on result not found."
        )

    return {

        "success":
            True,

        "url":
            f"/uploads/results/{file_path.name}",

        "download_url":
            f"/uploads/results/{file_path.name}"
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup_event():

    print()
    print("=" * 70)
    print("AI VIRTUAL FASHION STUDIO")
    print("=" * 70)

    print(
        "FastAPI backend started successfully."
    )

    print(
        "Version:",
        "3.0.0"
    )

    print(
        "AI Model:",
        "IDM-VTON"
    )

    print(
        "Hugging Face Space:",
        IDM_VTON_SPACE
    )

    print(
        "Automatic preprocessing:",
        "Enabled"
    )

    print(
        "Garment detection:",
        "Enabled"
    )

    print(
        "Image validation:",
        "Enabled"
    )

    print(
        "API Documentation:",
        "/docs"
    )

    print("=" * 70)
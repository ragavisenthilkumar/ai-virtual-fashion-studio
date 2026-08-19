from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv
import os
import shutil
import uuid
import base64
import asyncio

from fashn import Fashn


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# .env is located in:
# ai-virtual-fashion-studio/backend/.env
ENV_FILE = BASE_DIR.parent / ".env"

load_dotenv(ENV_FILE)

FASHN_API_KEY = os.getenv("FASHN_API_KEY")


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="AI Virtual Fashion Studio",
    description="AI Virtual Try-On API",
    version="2.0.0"
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

UPLOAD_DIR = BASE_DIR / "uploads"

USER_DIR = UPLOAD_DIR / "users"
GARMENT_DIR = UPLOAD_DIR / "garments"
RESULT_DIR = UPLOAD_DIR / "results"

USER_DIR.mkdir(parents=True, exist_ok=True)
GARMENT_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


# ============================================================
# IMAGE TYPES
# ============================================================

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}


def validate_image(filename: str):

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, PNG and WEBP files are allowed."
        )

    return extension


# ============================================================
# SAVE UPLOAD
# ============================================================

async def save_upload(
    file: UploadFile,
    directory: Path
):

    extension = validate_image(file.filename)

    filename = f"{uuid.uuid4().hex}{extension}"

    path = directory / filename

    try:

        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to save image: {str(e)}"
        )

    return filename, path


# ============================================================
# IMAGE -> DATA URL
# ============================================================

def convert_to_data_url(path: Path):

    extension = path.suffix.lower()

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }

    mime_type = mime_types.get(extension)

    if not mime_type:
        raise ValueError("Unsupported image format.")

    with open(path, "rb") as image:

        encoded = base64.b64encode(
            image.read()
        ).decode("utf-8")

    return f"data:{mime_type};base64,{encoded}"


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {
        "message": "AI Virtual Fashion Studio API is running!",
        "status": "success",
        "fashn_configured": bool(FASHN_API_KEY),
        "docs": "/docs"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "fashn_configured": bool(FASHN_API_KEY)
    }


# ============================================================
# UPLOAD USER
# ============================================================

@app.post("/upload-user")
async def upload_user(
    file: UploadFile = File(...)
):

    filename, path = await save_upload(
        file,
        USER_DIR
    )

    return {
        "success": True,
        "message": "User image uploaded successfully.",
        "filename": filename,
        "image_url": f"/uploads/users/{filename}"
    }


# ============================================================
# UPLOAD GARMENT
# ============================================================

@app.post("/upload-garment")
async def upload_garment(
    file: UploadFile = File(...)
):

    filename, path = await save_upload(
        file,
        GARMENT_DIR
    )

    return {
        "success": True,
        "message": "Garment image uploaded successfully.",
        "filename": filename,
        "image_url": f"/uploads/garments/{filename}"
    }


# ============================================================
# REAL AI VIRTUAL TRY-ON
# ============================================================

@app.post("/try-on")
async def try_on(
    user_image: UploadFile = File(...),
    garment_image: UploadFile = File(...)
):

    # --------------------------------------------------------
    # CHECK API KEY
    # --------------------------------------------------------

    if not FASHN_API_KEY:

        raise HTTPException(
            status_code=500,
            detail=(
                "FASHN_API_KEY not found. "
                "Check backend/.env"
            )
        )


    # --------------------------------------------------------
    # SAVE USER IMAGE
    # --------------------------------------------------------

    user_filename, user_path = await save_upload(
        user_image,
        USER_DIR
    )


    # --------------------------------------------------------
    # SAVE GARMENT IMAGE
    # --------------------------------------------------------

    garment_filename, garment_path = await save_upload(
        garment_image,
        GARMENT_DIR
    )


    try:

        print("Preparing images for FASHN...")


        # ----------------------------------------------------
        # CONVERT IMAGES
        # ----------------------------------------------------

        model_image = convert_to_data_url(
            user_path
        )

        garment = convert_to_data_url(
            garment_path
        )


        # ----------------------------------------------------
        # CREATE FASHN CLIENT
        # ----------------------------------------------------

        print("Connecting to FASHN...")

        client = Fashn(
            api_key=FASHN_API_KEY
        )


        # ----------------------------------------------------
        # START PREDICTION
        # ----------------------------------------------------

        print("Starting virtual try-on...")

        prediction = client.predictions.create(
            model_name="tryon-v1.6",
            inputs={
                "model_image": model_image,
                "garment_image": garment
            }
        )


        prediction_id = prediction.id

        print(
            "Prediction ID:",
            prediction_id
        )


        # ----------------------------------------------------
        # WAIT FOR RESULT
        # ----------------------------------------------------

        for attempt in range(60):

            await asyncio.sleep(2)

            result = client.predictions.get(
                prediction_id
            )

            status = result.status

            print(
                f"Attempt {attempt + 1}: {status}"
            )


            # ------------------------------------------------
            # COMPLETED
            # ------------------------------------------------

            if status == "completed":

                output = result.output

                if not output:

                    raise HTTPException(
                        status_code=500,
                        detail=(
                            "FASHN completed the prediction "
                            "but returned no image."
                        )
                    )

                generated_image_url = output[0]


                return {
                    "success": True,
                    "status": "completed",

                    "message": (
                        "Virtual try-on generated successfully!"
                    ),

                    "prediction_id": prediction_id,

                    "user_image": {
                        "filename": user_filename,
                        "url": (
                            f"/uploads/users/"
                            f"{user_filename}"
                        )
                    },

                    "garment_image": {
                        "filename": garment_filename,
                        "url": (
                            f"/uploads/garments/"
                            f"{garment_filename}"
                        )
                    },

                    "result": {
                        "url": generated_image_url
                    }
                }


            # ------------------------------------------------
            # FAILED
            # ------------------------------------------------

            if status == "failed":

                error = getattr(
                    result,
                    "error",
                    "FASHN prediction failed."
                )

                raise HTTPException(
                    status_code=500,
                    detail=str(error)
                )


        # ----------------------------------------------------
        # TIMEOUT
        # ----------------------------------------------------

        raise HTTPException(
            status_code=504,
            detail=(
                "FASHN prediction timed out. "
                "Please try again."
            )
        )


    except HTTPException:

        raise


    except Exception as e:

        print(
            "FASHN ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"FASHN error: {str(e)}"
        )


# ============================================================
# USER IMAGE
# ============================================================

@app.get("/user-image/{filename}")
async def get_user_image(
    filename: str
):

    path = USER_DIR / filename

    if not path.exists():

        raise HTTPException(
            status_code=404,
            detail="User image not found."
        )

    return {
        "success": True,
        "url": f"/uploads/users/{filename}"
    }


# ============================================================
# GARMENT IMAGE
# ============================================================

@app.get("/garment-image/{filename}")
async def get_garment_image(
    filename: str
):

    path = GARMENT_DIR / filename

    if not path.exists():

        raise HTTPException(
            status_code=404,
            detail="Garment image not found."
        )

    return {
        "success": True,
        "url": f"/uploads/garments/{filename}"
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup():

    print("=" * 60)
    print("AI VIRTUAL FASHION STUDIO")
    print("=" * 60)

    print(
        "FASHN API configured:",
        bool(FASHN_API_KEY)
    )

    print(
        "Swagger:",
        "http://127.0.0.1:8000/docs"
    )

    print("=" * 60)
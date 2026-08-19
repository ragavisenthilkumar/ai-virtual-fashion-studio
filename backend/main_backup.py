from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pathlib import Path
import shutil
import uuid
import asyncio

from gradio_client import Client, handle_file


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="AI Virtual Fashion Studio",
    description="AI Virtual Try-On using IDM-VTON",
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

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"

USER_DIR = UPLOAD_DIR / "users"
GARMENT_DIR = UPLOAD_DIR / "garments"
RESULT_DIR = UPLOAD_DIR / "results"

USER_DIR.mkdir(parents=True, exist_ok=True)
GARMENT_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# STATIC FILES
# ============================================================

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


# ============================================================
# IDM-VTON HUGGING FACE SPACE
# ============================================================

IDM_VTON_SPACE = "yisol/IDM-VTON"


# ============================================================
# ALLOWED IMAGE TYPES
# ============================================================

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}


# ============================================================
# IMAGE VALIDATION
# ============================================================

def check_image(filename: str):

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing."
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid image type. "
                "Only JPG, JPEG, PNG and WEBP are allowed."
            )
        )

    return extension


# ============================================================
# SAVE IMAGE
# ============================================================

async def save_uploaded_file(
    file: UploadFile,
    directory: Path
):

    extension = check_image(file.filename)

    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )

    file_path = directory / unique_filename

    try:

        with file_path.open("wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Could not save image: {str(e)}"
        )

    return unique_filename, file_path


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {
        "message": "AI Virtual Fashion Studio API is running!",
        "status": "success",
        "model": "IDM-VTON",
        "space": IDM_VTON_SPACE,
        "docs": "/docs"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "backend": "FastAPI",
        "ai_model": "IDM-VTON"
    }


# ============================================================
# UPLOAD USER IMAGE
# ============================================================

@app.post("/upload-user")
async def upload_user_image(
    file: UploadFile = File(...)
):

    filename, file_path = await save_uploaded_file(
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
# UPLOAD GARMENT IMAGE
# ============================================================

@app.post("/upload-garment")
async def upload_garment_image(
    file: UploadFile = File(...)
):

    filename, file_path = await save_uploaded_file(
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
# VIRTUAL TRY-ON
# ============================================================

@app.post("/try-on")
async def virtual_try_on(
    user_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    garment_description: str = Form(
        "a garment"
    )
):

    # --------------------------------------------------------
    # SAVE USER IMAGE
    # --------------------------------------------------------

    user_filename, user_path = (
        await save_uploaded_file(
            user_image,
            USER_DIR
        )
    )


    # --------------------------------------------------------
    # SAVE GARMENT IMAGE
    # --------------------------------------------------------

    garment_filename, garment_path = (
        await save_uploaded_file(
            garment_image,
            GARMENT_DIR
        )
    )


    print()
    print("=" * 60)
    print("IDM-VTON VIRTUAL TRY-ON")
    print("=" * 60)

    print(
        "User image:",
        user_filename
    )

    print(
        "Garment image:",
        garment_filename
    )

    print(
        "Garment description:",
        garment_description
    )


    try:

        # ----------------------------------------------------
        # CONNECT TO HUGGING FACE SPACE
        # ----------------------------------------------------

        print()
        print("Connecting to IDM-VTON...")

        client = Client(IDM_VTON_SPACE)

        print(
            "Connected to:",
            IDM_VTON_SPACE
        )


        # ----------------------------------------------------
        # IDM-VTON IMAGE EDITOR INPUT
        #
        # The official Space expects an ImageEditor object
        # containing the user's image as "background".
        # ----------------------------------------------------

        human_image = {
            "background": handle_file(
                str(user_path)
            ),
            "layers": [],
            "composite": None
        }


        # ----------------------------------------------------
        # SEND REQUEST
        # ----------------------------------------------------

        print()
        print("Sending images to IDM-VTON...")
        print("This may take some time on the free Space...")


        result = await asyncio.to_thread(

            client.predict,

            human_image,

            handle_file(
                str(garment_path)
            ),

            garment_description,

            True,       # auto mask

            False,      # auto crop

            30,         # denoising steps

            42,         # seed

            api_name="/tryon"
        )


        print()
        print("IDM-VTON response received.")


        # ----------------------------------------------------
        # RESULT
        #
        # IDM-VTON returns:
        #
        # result[0] = generated image
        # result[1] = mask image
        # ----------------------------------------------------

        if not result:

            raise HTTPException(
                status_code=500,
                detail=(
                    "IDM-VTON returned an empty result."
                )
            )


        generated_result = result[0]


        # ----------------------------------------------------
        # GRADIO MAY RETURN A FILE PATH
        # ----------------------------------------------------

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
                    "Unexpected IDM-VTON result format."
                )
            )


        if not generated_path.exists():

            raise HTTPException(
                status_code=500,
                detail=(
                    "IDM-VTON generated an output, "
                    "but the output file could not be found."
                )
            )


        # ----------------------------------------------------
        # COPY RESULT TO OUR RESULTS DIRECTORY
        # ----------------------------------------------------

        result_extension = (
            generated_path.suffix
            if generated_path.suffix
            else ".png"
        )

        result_filename = (
            f"{uuid.uuid4().hex}"
            f"{result_extension}"
        )

        result_path = (
            RESULT_DIR /
            result_filename
        )


        shutil.copy2(
            generated_path,
            result_path
        )


        result_url = (
            f"/uploads/results/"
            f"{result_filename}"
        )


        print()
        print("=" * 60)
        print("IDM-VTON COMPLETED")
        print("=" * 60)

        print(
            "Result:",
            result_url
        )

        print("=" * 60)


        # ----------------------------------------------------
        # RETURN TO FRONTEND
        # ----------------------------------------------------

        return {

            "success": True,

            "status": "completed",

            "message": (
                "Virtual try-on generated successfully!"
            ),

            "model": "IDM-VTON",

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
                "filename": result_filename,
                "url": result_url
            }
        }


    except HTTPException:

        raise


    except Exception as e:

        print()
        print("=" * 60)
        print("IDM-VTON ERROR")
        print("=" * 60)

        print(
            repr(e)
        )

        print("=" * 60)


        raise HTTPException(
            status_code=500,
            detail=(
                "IDM-VTON virtual try-on failed: "
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

    file_path = USER_DIR / filename

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="User image not found."
        )

    return {
        "success": True,
        "url": (
            f"/uploads/users/"
            f"{filename}"
        )
    }


# ============================================================
# GET GARMENT IMAGE
# ============================================================

@app.get("/garment-image/{filename}")
async def get_garment_image(
    filename: str
):

    file_path = GARMENT_DIR / filename

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Garment image not found."
        )

    return {
        "success": True,
        "url": (
            f"/uploads/garments/"
            f"{filename}"
        )
    }


# ============================================================
# GET RESULT
# ============================================================

@app.get("/result/{filename}")
async def get_result(
    filename: str
):

    file_path = RESULT_DIR / filename

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Try-on result not found."
        )

    return {
        "success": True,
        "url": (
            f"/uploads/results/"
            f"{filename}"
        )
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup_event():

    print("=" * 60)
    print("AI VIRTUAL FASHION STUDIO")
    print("=" * 60)

    print(
        "FastAPI backend started successfully."
    )

    print(
        "AI Model: IDM-VTON"
    )

    print(
        "Hugging Face Space:",
        IDM_VTON_SPACE
    )

    print(
        "API Documentation:",
        "http://127.0.0.1:8000/docs"
    )

    print(
        "User uploads:",
        "uploads/users/"
    )

    print(
        "Garment uploads:",
        "uploads/garments/"
    )

    print(
        "Try-on results:",
        "uploads/results/"
    )

    print("=" * 60)
import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [userImage, setUserImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);

  const [userPreview, setUserPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);

  const [resultImage, setResultImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [comparison, setComparison] = useState(50);

  // ============================================================
  // HANDLE USER IMAGE
  // ============================================================

  const handleUserImage = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image.");
      return;
    }

    setError("");
    setUserImage(file);
    setUserPreview(URL.createObjectURL(file));
    setResultImage(null);
  };


  // ============================================================
  // HANDLE GARMENT IMAGE
  // ============================================================

  const handleGarmentImage = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid garment image.");
      return;
    }

    setError("");
    setGarmentImage(file);
    setGarmentPreview(URL.createObjectURL(file));
    setResultImage(null);
  };


  // ============================================================
  // TRY ON
  // ============================================================

  const handleTryOn = async () => {
    if (!userImage || !garmentImage) {
      setError("Please upload both your photo and the garment image.");
      return;
    }

    setLoading(true);
    setError("");
    setResultImage(null);

    try {
      const formData = new FormData();

      formData.append("user_image", userImage);
      formData.append("garment_image", garmentImage);

      const response = await fetch(
        `${API_URL}/try-on`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to generate the virtual try-on."
        );
      }

      if (!data.success) {
        throw new Error(
          "AI virtual try-on was not successful."
        );
      }

      const generatedImage =
        `${API_URL}${data.result.url}`;

      setResultImage(generatedImage);

      setTimeout(() => {
        document
          .getElementById("result-section")
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 300);

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };


  // ============================================================
  // DOWNLOAD RESULT
  // ============================================================

  const handleDownload = async () => {
    if (!resultImage) return;

    try {
      const response = await fetch(resultImage);

      const blob = await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "ai-virtual-fashion-result.png";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(
        "Download failed:",
        error
      );

      alert(
        "Unable to download the image. Please try again."
      );
    }
  };


  // ============================================================
  // RESET
  // ============================================================

  const handleReset = () => {
    setUserImage(null);
    setGarmentImage(null);

    setUserPreview(null);
    setGarmentPreview(null);

    setResultImage(null);

    setError("");

    setComparison(50);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  return (
    <div className="app">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="header">

        <div className="logo">
          <span className="logo-icon">
            ✨
          </span>

          <span>
            AI Virtual Fashion Studio
          </span>
        </div>

        <a
          href="#try-on"
          className="nav-button"
        >
          Try It On
        </a>

      </header>


      {/* ====================================================== */}
      {/* HERO */}
      {/* ====================================================== */}

      <section className="hero">

        <div className="hero-content">

          <div className="badge">
            AI POWERED VIRTUAL TRY-ON
          </div>

          <h1>
            Try Your Fashion
            <span> Before You Wear It.</span>
          </h1>

          <p>
            Upload your photo and your favorite garment.
            Our AI creates a virtual try-on result so you can
            visualize your new look.
          </p>

          <a
            href="#try-on"
            className="hero-button"
          >
            ✨ Start Virtual Try-On
          </a>

        </div>

      </section>


      {/* ====================================================== */}
      {/* HOW IT WORKS */}
      {/* ====================================================== */}

      <section className="how-it-works">

        <h2>
          How It Works
        </h2>

        <div className="steps">

          <div className="step-card">

            <div className="step-number">
              1
            </div>

            <h3>
              Upload Your Photo
            </h3>

            <p>
              Choose a clear photo where your body and clothing
              area are visible.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              2
            </div>

            <h3>
              Upload Garment
            </h3>

            <p>
              Upload a clear image of the clothing you want to try.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              3
            </div>

            <h3>
              AI Try-On
            </h3>

            <p>
              Our AI processes both images and creates your
              virtual fashion result.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              4
            </div>

            <h3>
              Compare & Download
            </h3>

            <p>
              Compare your original and generated image and
              download your result.
            </p>

          </div>

        </div>

      </section>


      {/* ====================================================== */}
      {/* TRY ON */}
      {/* ====================================================== */}

      <section
        id="try-on"
        className="try-on-section"
      >

        <div className="section-heading">

          <div className="badge">
            CREATE YOUR LOOK
          </div>

          <h2>
            Virtual Try-On
          </h2>

          <p>
            Upload your photo and the garment you want to try.
          </p>

        </div>


        {/* ERROR */}

        {error && (

          <div className="error-message">

            ⚠️ {error}

          </div>

        )}


        {/* UPLOAD CONTAINER */}

        <div className="upload-container">


          {/* USER IMAGE */}

          <div className="upload-card">

            <div className="upload-header">

              <div className="upload-icon">
                📷
              </div>

              <div>

                <h3>
                  Upload Your Photo
                </h3>

                <p>
                  Clear full or upper-body photo
                </p>

              </div>

            </div>


            <label className="upload-area">

              <input
                type="file"
                accept="image/*"
                onChange={handleUserImage}
              />

              {userPreview ? (

                <img
                  src={userPreview}
                  alt="User preview"
                  className="preview-image"
                />

              ) : (

                <div className="upload-placeholder">

                  <div className="big-icon">
                    👤
                  </div>

                  <strong>
                    Choose Your Photo
                  </strong>

                  <span>
                    JPG, PNG, JPEG or WEBP
                  </span>

                </div>

              )}

            </label>

          </div>


          {/* GARMENT IMAGE */}

          <div className="upload-card">

            <div className="upload-header">

              <div className="upload-icon">
                👕
              </div>

              <div>

                <h3>
                  Upload Garment
                </h3>

                <p>
                  Clear garment on a simple background
                </p>

              </div>

            </div>


            <label className="upload-area">

              <input
                type="file"
                accept="image/*"
                onChange={handleGarmentImage}
              />

              {garmentPreview ? (

                <img
                  src={garmentPreview}
                  alt="Garment preview"
                  className="preview-image"
                />

              ) : (

                <div className="upload-placeholder">

                  <div className="big-icon">
                    👕

                  </div>

                  <strong>
                    Choose Garment Image
                  </strong>

                  <span>
                    JPG, PNG, JPEG or WEBP
                  </span>

                </div>

              )}

            </label>

          </div>

        </div>


        {/* AI BUTTON */}

        <div className="button-container">

          <button
            className="try-button"
            onClick={handleTryOn}
            disabled={
              loading ||
              !userImage ||
              !garmentImage
            }
          >

            {loading ? (

              <>
                <span className="spinner"></span>
                AI is creating your look...
              </>

            ) : (

              <>
                ✨ Try It On
              </>

            )}

          </button>


          {loading && (

            <p className="loading-text">

              Analyzing your photo and garment.
              Generating your virtual try-on...

            </p>

          )}

        </div>

      </section>


      {/* ====================================================== */}
      {/* RESULT */}
      {/* ====================================================== */}

      {resultImage && userPreview && (

        <section
          id="result-section"
          className="result-section"
        >

          <div className="section-heading">

            <div className="badge">
              AI GENERATED RESULT
            </div>

            <h2>
              Your Virtual Look
            </h2>

            <p>
              Compare your original image with the AI-generated result.
            </p>

          </div>


          {/* ================================================ */}
          {/* COMPARISON SLIDER */}
          {/* ================================================ */}

          <div className="comparison-wrapper">

            <div className="comparison-label before-label">
              BEFORE
            </div>

            <div className="comparison-label after-label">
              AFTER
            </div>


            <div className="comparison-container">

              {/* AFTER IMAGE */}

              <img
                src={resultImage}
                alt="AI virtual try-on result"
                className="comparison-after"
              />


              {/* BEFORE IMAGE */}

              <div
                className="comparison-before-wrapper"
                style={{
                  width: `${comparison}%`
                }}
              >

                <img
                  src={userPreview}
                  alt="Original user"
                  className="comparison-before"
                />

              </div>


              {/* SLIDER LINE */}

              <div
                className="comparison-line"
                style={{
                  left: `${comparison}%`
                }}
              >

                <div className="comparison-handle">
                  ↔
                </div>

              </div>


              {/* RANGE */}

              <input
                type="range"
                min="0"
                max="100"
                value={comparison}
                onChange={(event) =>
                  setComparison(
                    Number(event.target.value)
                  )
                }
                className="comparison-range"
              />

            </div>

          </div>


          {/* ================================================ */}
          {/* RESULT ACTIONS */}
          {/* ================================================ */}

          <div className="result-actions">

            <button
              className="download-button"
              onClick={handleDownload}
            >

              ⬇ Download Result

            </button>


            <button
              className="reset-button"
              onClick={handleReset}
            >

              ↻ Try Another Outfit

            </button>

          </div>

        </section>

      )}


      {/* ====================================================== */}
      {/* FOOTER */}
      {/* ====================================================== */}

      <footer className="footer">

        <h3>
          ✨ AI Virtual Fashion Studio
        </h3>

        <p>
          AI-powered virtual fashion visualization.
        </p>

      </footer>

    </div>
  );
}

export default App;
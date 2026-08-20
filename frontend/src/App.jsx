import React, { useEffect, useState } from "react";
import "./App.css";

import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ImageUpload from "./components/ImageUpload";
import GarmentUpload from "./components/GarmentUpload";
import ProcessingStatus from "./components/ProcessingStatus";
import TryOnResult from "./components/TryOnResult";
import History from "./components/History";
import ResetPassword from "./components/ResetPassword";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-fashion-api-2026.onrender.com";

function App() {
  const resetToken = new URLSearchParams(
    window.location.search
  ).get("reset-token");

  const [user, setUser] = useState(
    localStorage.getItem("fashionUser")
  );

  const [page, setPage] = useState("home");

  const [personImage, setPersonImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("tryOnHistory") || "[]"
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "tryOnHistory",
      JSON.stringify(history)
    );
  }, [history]);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = (email) => {
    localStorage.setItem("fashionUser", email);
    setUser(email);
    setPage("home");
  };

  // ==========================================================
  // SIGNUP
  // ==========================================================

  const handleSignup = (name) => {
    localStorage.setItem("fashionUser", name);
    setUser(name);
    setPage("home");
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    localStorage.removeItem("fashionUser");

    setUser(null);
    setPersonImage(null);
    setGarmentImage(null);
    setResult(null);
    setError("");
  };

  // ==========================================================
  // RESET TRY-ON
  // ==========================================================

  const handleReset = () => {
    setPersonImage(null);
    setGarmentImage(null);
    setResult(null);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================================
  // VIRTUAL TRY-ON
  // ==========================================================

  const handleTryOn = async () => {
    if (!personImage) {
      setError("Please upload your photo first.");
      return;
    }

    if (!garmentImage) {
      setError("Please upload a garment image.");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      // IMPORTANT:
      // These names MUST match FastAPI.
      formData.append("user_image", personImage);
      formData.append("garment_image", garmentImage);

      console.log("Sending request to:", `${API_URL}/try-on`);

      const response = await fetch(
        `${API_URL}/try-on`,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        "Backend status:",
        response.status
      );

      if (!response.ok) {
        let message =
          "Virtual try-on failed.";

        try {
          const errorData =
            await response.json();

          console.error(
            "Backend error:",
            errorData
          );

          message =
            errorData.detail ||
            errorData.message ||
            message;
        } catch {
          // Keep default message
        }

        throw new Error(message);
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let resultUrl;

      // ======================================================
      // JSON RESPONSE
      // ======================================================

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const data =
          await response.json();

        console.log(
          "Backend response:",
          data
        );

        // Your FastAPI backend returns:
        //
        // {
        //   "result": {
        //      "url": "/uploads/results/...",
        //      "download_url": "/uploads/results/..."
        //   }
        // }

        resultUrl =
          data.result?.url ||
          data.result?.download_url ||
          data.image_url ||
          data.result_url ||
          data.output_url ||
          data.url;

        // Base64 fallback
        if (
          !resultUrl &&
          data.image
        ) {
          resultUrl =
            `data:image/png;base64,${data.image}`;
        }
      }

      // ======================================================
      // IMAGE/BLOB RESPONSE
      // ======================================================

      else {
        const blob =
          await response.blob();

        resultUrl =
          URL.createObjectURL(blob);
      }

      // ======================================================
      // CHECK RESULT
      // ======================================================

      if (!resultUrl) {
        throw new Error(
          "The backend did not return a result image."
        );
      }

      // ======================================================
      // CONVERT RELATIVE URL
      // ======================================================

      if (
        resultUrl.startsWith("/") &&
        !resultUrl.startsWith("//")
      ) {
        resultUrl =
          `${API_URL}${resultUrl}`;
      }

      console.log(
        "Final result image:",
        resultUrl
      );

      // ======================================================
      // DISPLAY RESULT
      // ======================================================

      setResult(resultUrl);

      // ======================================================
      // SAVE HISTORY
      // ======================================================

      setHistory((previous) => [
        {
          image: resultUrl,
          date:
            new Date().toLocaleString(),
        },
        ...previous,
      ]);

    } catch (err) {
      console.error(
        "TRY-ON ERROR:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while generating the try-on."
      );

    } finally {
      setProcessing(false);
    }
  };

  // ==========================================================
  // CLEAR HISTORY
  // ==========================================================

  const clearHistory = () => {
    setHistory([]);

    localStorage.removeItem(
      "tryOnHistory"
    );
  };

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  if (resetToken) {
    return (
      <ResetPassword
        token={resetToken}
        onBackToLogin={() => {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          window.location.reload();
        }}
      />
    );
  }

  // ==========================================================
  // LOGIN / SIGNUP
  // ==========================================================

  if (!user) {
    if (page === "signup") {
      return (
        <Signup
          onSignup={handleSignup}
          onLogin={() =>
            setPage("login")
          }
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onSignup={() =>
          setPage("signup")
        }
      />
    );
  }

  // ==========================================================
  // MAIN APP
  // ==========================================================

  return (
    <div className="app">

      <Navbar
        user={user}
        onLogout={handleLogout}
        onHome={() =>
          setPage("home")
        }
        onHistory={() =>
          setPage("history")
        }
      />

      {page === "history" ? (

        <History
          history={history}
          onClear={clearHistory}
        />

      ) : (

        <main className="main-container">

          <section className="hero-section">

            <div>

              <span className="hero-badge">
                ✨ AI POWERED FASHION
              </span>

              <h1>
                Try Clothes
                <br />
                <span>Virtually</span>
              </h1>

              <p>
                Upload your photo and a
                garment image. Our AI will
                visualize how the outfit
                looks on you.
              </p>

            </div>

          </section>

          <section className="tryon-section">

            <div className="upload-grid">

              <ImageUpload
                image={personImage}
                setImage={setPersonImage}
              />

              <GarmentUpload
                garment={garmentImage}
                setGarment={setGarmentImage}
              />

            </div>

            <button
              className="tryon-btn"
              onClick={handleTryOn}
              disabled={
                processing ||
                !personImage ||
                !garmentImage
              }
            >
              {processing
                ? "✨ Creating Your Outfit..."
                : "✨ Generate Virtual Try-On"}
            </button>

            <ProcessingStatus
              processing={processing}
              error={error}
            />

            <TryOnResult
              result={result}
              onReset={handleReset}
            />

          </section>

        </main>

      )}

    </div>
  );
}

export default App;
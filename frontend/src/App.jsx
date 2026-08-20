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

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
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

  const handleLogin = (email) => {
    localStorage.setItem("fashionUser", email);
    setUser(email);
    setPage("home");
  };

  const handleSignup = (name) => {
    localStorage.setItem("fashionUser", name);
    setUser(name);
    setPage("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("fashionUser");

    setUser(null);
    setPersonImage(null);
    setGarmentImage(null);
    setResult(null);
    setError("");
  };

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

      formData.append("person_image", personImage);
      formData.append("garment_image", garmentImage);

      const response = await fetch(`${API_URL}/try-on`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Virtual try-on failed.";

        try {
          const errorData = await response.json();
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
        response.headers.get("content-type") || "";

      let resultUrl;

      if (contentType.includes("application/json")) {
        const data = await response.json();

        resultUrl =
          data.image_url ||
          data.result_url ||
          data.output_url ||
          data.url;

        if (!resultUrl && data.image) {
          resultUrl = `data:image/png;base64,${data.image}`;
        }
      } else {
        const blob = await response.blob();
        resultUrl = URL.createObjectURL(blob);
      }

      if (!resultUrl) {
        throw new Error(
          "The backend did not return a result image."
        );
      }

      if (
        resultUrl.startsWith("/") &&
        !resultUrl.startsWith("//")
      ) {
        resultUrl = `${API_URL}${resultUrl}`;
      }

      setResult(resultUrl);

      setHistory((previous) => [
        {
          image: resultUrl,
          date: new Date().toLocaleString(),
        },
        ...previous,
      ]);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Something went wrong while generating the try-on."
      );
    } finally {
      setProcessing(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("tryOnHistory");
  };

  if (!user) {
    if (page === "signup") {
      return (
        <Signup
          onSignup={handleSignup}
          onLogin={() => setPage("login")}
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onSignup={() => setPage("signup")}
      />
    );
  }

  return (
    <div className="app">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onHome={() => setPage("home")}
        onHistory={() => setPage("history")}
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
                Upload your photo and a garment image.
                Our AI will visualize how the outfit
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
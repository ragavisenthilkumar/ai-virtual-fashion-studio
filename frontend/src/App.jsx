import React, { useEffect, useState } from "react";
import "./App.css";

/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const PRODUCTION_API =
  "https://ai-fashion-api-2026.onrender.com";

/* =========================================================
   HELPERS
   ========================================================= */

function getApiUrl() {
  return API_URL || PRODUCTION_API;
}

function resolveImageUrl(url) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${getApiUrl()}${url}`;
  }

  return `${getApiUrl()}/${url}`;
}

/* =========================================================
   NAVBAR
   ========================================================= */

function Navbar({
  user,
  currentPage,
  setCurrentPage,
  onLogout,
}) {
  return (
    <nav className="luxury-navbar">
      <div
        className="brand"
        onClick={() => setCurrentPage("home")}
      >
        <div className="brand-mark">A</div>

        <div className="brand-text">
          <span className="brand-main">
            AI VIRTUAL
          </span>

          <span className="brand-sub">
            FASHION STUDIO
          </span>
        </div>
      </div>

      {user && (
        <div className="nav-center">
          <button
            className={
              currentPage === "home"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setCurrentPage("home")}
          >
            Studio
          </button>

          <button
            className={
              currentPage === "history"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setCurrentPage("history")}
          >
            Archive
          </button>
        </div>
      )}

      {user && (
        <div className="nav-right">
          <div className="nav-profile">
            <div className="profile-dot">
              {user.charAt(0).toUpperCase()}
            </div>

            <span className="profile-email">
              {user}
            </span>
          </div>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

/* =========================================================
   AUTH PAGE
   ========================================================= */

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);

    try {
      /*
       * The authentication interface is kept lightweight here.
       * Your existing backend authentication can be connected
       * without changing the luxury UI.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      localStorage.setItem("fashion_user", email);

      onLogin(email);
    } catch (err) {
      setError(
        err.message || "Unable to continue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      {/* LEFT EDITORIAL PANEL */}

      <section className="auth-editorial">
        <div className="editorial-overlay" />

        <div className="editorial-content">
          <span className="editorial-kicker">
            AI × FASHION
          </span>

          <h1>
            Where
            <br />
            <em>technology</em>
            <br />
            meets style.
          </h1>

          <p>
            Reimagine your wardrobe through
            an intelligent virtual fashion
            experience.
          </p>

          <div className="editorial-line" />

          <span className="editorial-caption">
            VIRTUAL FASHION STUDIO · 2026
          </span>
        </div>
      </section>

      {/* RIGHT AUTH PANEL */}

      <section className="auth-panel">
        <div className="auth-inner">

          <div className="auth-heading">
            <span className="small-label">
              {mode === "login"
                ? "WELCOME BACK"
                : "JOIN THE STUDIO"}
            </span>

            <h2>
              {mode === "login"
                ? "Enter the Studio"
                : "Create your account"}
            </h2>

            <p>
              {mode === "login"
                ? "Continue your fashion journey."
                : "Begin your personalized virtual wardrobe."}
            </p>
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            <div className="luxury-input-group">
              <label>Email address</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            <div className="luxury-input-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />
            </div>

            {mode === "signup" && (
              <div className="luxury-input-group">
                <label>Confirm password</label>

                <input
                  type="password"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {error && (
              <div className="luxury-error">
                {error}
              </div>
            )}

            <button
              className="luxury-main-button"
              disabled={loading}
            >
              <span>
                {loading
                  ? "ENTERING..."
                  : mode === "login"
                  ? "ENTER STUDIO"
                  : "CREATE ACCOUNT"}
              </span>

              <span className="button-arrow">
                →
              </span>
            </button>
          </form>

          <div className="auth-switch">
            <span>
              {mode === "login"
                ? "New to the studio?"
                : "Already a member?"}
            </span>

            <button
              onClick={() =>
                setMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }
            >
              {mode === "login"
                ? "Create account"
                : "Sign in"}
            </button>
          </div>

          <div className="auth-footer">
            <span>PRIVATE</span>
            <span>·</span>
            <span>CURATED</span>
            <span>·</span>
            <span>INTELLIGENT</span>
          </div>

        </div>
      </section>
    </div>
  );
}

/* =========================================================
   UPLOAD CARD
   ========================================================= */

function UploadCard({
  number,
  title,
  description,
  icon,
  file,
  onChange,
  onRemove,
}) {
  return (
    <section className="upload-card">

      <div className="card-top">
        <div className="step-label">
          {number}
        </div>

        <div className="card-title-area">
          <span className="card-eyebrow">
            STEP {number}
          </span>

          <h3>{title}</h3>
        </div>
      </div>

      <p className="card-description">
        {description}
      </p>

      {!file ? (
        <label className="drop-zone">

          <input
            type="file"
            accept="image/*"
            onChange={onChange}
          />

          <div className="drop-icon">
            {icon}
          </div>

          <div className="drop-title">
            Select image
          </div>

          <div className="drop-subtitle">
            JPG, PNG or WEBP
          </div>

          <span className="select-file-button">
            Choose file
          </span>

        </label>
      ) : (
        <div className="image-preview-area">

          <img
            src={URL.createObjectURL(file)}
            alt={title}
          />

          <div className="preview-footer">
            <span className="file-name">
              {file.name}
            </span>

            <button
              className="remove-button"
              onClick={onRemove}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   STUDIO PAGE
   ========================================================= */

function Studio({ onHistoryAdd }) {
  const [userImage, setUserImage] = useState(null);
  const [garmentImage, setGarmentImage] =
    useState(null);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stage, setStage] = useState("");

  async function generateTryOn() {
    setError("");

    if (!userImage || !garmentImage) {
      setError(
        "Please upload both your photo and garment."
      );
      return;
    }

    setLoading(true);
    setResult(null);

    setStage("Preparing your look...");

    try {
      const formData = new FormData();

      formData.append(
        "user_image",
        userImage
      );

      formData.append(
        "garment_image",
        garmentImage
      );

      setTimeout(() => {
        setStage("Curating your virtual look...");
      }, 1200);

      const response = await fetch(
        `${getApiUrl()}/try-on`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let message =
          "Virtual try-on failed.";

        try {
          const errorData =
            await response.json();

          message =
            errorData.detail ||
            errorData.message ||
            message;
        } catch {
          // Keep default error
        }

        throw new Error(message);
      }

      const data = await response.json();

      const resultUrl = resolveImageUrl(
        data?.result?.url ||
          data?.result?.download_url ||
          data?.download_url ||
          data?.url
      );

      if (!resultUrl) {
        throw new Error(
          "The AI completed the request, but no result image was returned."
        );
      }

      setStage("Your look is ready.");

      setResult(resultUrl);

      onHistoryAdd({
        id: Date.now(),
        url: resultUrl,
        date: new Date().toLocaleString(),
      });

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Something went wrong while creating your look."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetStudio() {
    setUserImage(null);
    setGarmentImage(null);
    setResult(null);
    setError("");
    setStage("");
  }

  return (
    <main>

      {/* HERO */}

      <section className="luxury-hero">

        <div className="hero-top-line">
          <span>THE DIGITAL ATELIER</span>

          <span>EST. 2026</span>
        </div>

        <div className="hero-content">

          <span className="hero-kicker">
            AI POWERED · VIRTUAL COUTURE
          </span>

          <h1>
            Your style,
            <br />
            <em>reimagined.</em>
          </h1>

          <p>
            Step into a new era of personal fashion.
            Upload your photograph and a garment to
            discover how your next look could become
            reality.
          </p>

          <div className="hero-ornament">
            <span />
            <i>✦</i>
            <span />
          </div>

        </div>
      </section>

      {/* STUDIO */}

      <section className="studio-container">

        <div className="section-heading">

          <div>
            <span className="section-kicker">
              THE VIRTUAL FITTING ROOM
            </span>

            <h2>
              Curate your look
            </h2>
          </div>

          <span className="section-number">
            01 / 02
          </span>

        </div>

        <div className="upload-grid">

          <UploadCard
            number="01"
            title="Your portrait"
            description="Upload a clear photograph of yourself for the most natural result."
            icon="◉"
            file={userImage}
            onChange={(e) =>
              setUserImage(
                e.target.files?.[0] || null
              )
            }
            onRemove={() =>
              setUserImage(null)
            }
          />

          <UploadCard
            number="02"
            title="Your garment"
            description="Choose the clothing piece you would like to virtually wear."
            icon="◇"
            file={garmentImage}
            onChange={(e) =>
              setGarmentImage(
                e.target.files?.[0] || null
              )
            }
            onRemove={() =>
              setGarmentImage(null)
            }
          />

        </div>

        {error && (
          <div className="luxury-error studio-error">
            <span>!</span>
            {error}
          </div>
        )}

        {/* GENERATE */}

        <div className="generate-area">

          <div className="generate-caption">
            <span>
              IDM-VTON
            </span>

            <span>
              AI VIRTUAL TRY-ON
            </span>

            <span>
              ✦
            </span>
          </div>

          <button
            className="generate-button"
            onClick={generateTryOn}
            disabled={
              loading ||
              !userImage ||
              !garmentImage
            }
          >
            <span className="generate-icon">
              ✦
            </span>

            <span>
              {loading
                ? "CREATING YOUR LOOK..."
                : "CREATE MY LOOK"}
            </span>

            <span className="generate-arrow">
              →
            </span>
          </button>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="luxury-loading">

            <div className="loading-orbit">
              <span />
            </div>

            <div>
              <strong>
                {stage ||
                  "Curating your virtual look..."}
              </strong>

              <p>
                Our AI is carefully composing
                your garment and silhouette.
              </p>
            </div>

          </div>
        )}

        {/* RESULT */}

        {result && !loading && (
          <section className="luxury-result">

            <div className="result-heading">

              <span>
                THE FINAL LOOK
              </span>

              <h2>
                Your look,
                <br />
                <em>reimagined.</em>
              </h2>

              <p>
                Your virtual fitting is ready.
              </p>

            </div>

            <div className="result-frame">

              <div className="frame-label top-left">
                AI VIRTUAL FASHION
              </div>

              <div className="frame-label top-right">
                2026
              </div>

              <img
                src={result}
                alt="Virtual try-on result"
              />

              <div className="frame-label bottom-left">
                IDM-VTON
              </div>

              <div className="frame-label bottom-right">
                ✦
              </div>

            </div>

            <div className="result-actions">

              <a
                href={result}
                download="virtual-fashion-result.png"
                target="_blank"
                rel="noreferrer"
                className="luxury-action primary"
              >
                <span>↓</span>
                Download look
              </a>

              <button
                className="luxury-action secondary"
                onClick={resetStudio}
              >
                <span>↻</span>
                Try another look
              </button>

            </div>

          </section>
        )}

      </section>
    </main>
  );
}

/* =========================================================
   HISTORY PAGE
   ========================================================= */

function History({ history }) {
  return (
    <main className="archive-page">

      <div className="archive-header">

        <div>
          <span className="section-kicker">
            YOUR PERSONAL ARCHIVE
          </span>

          <h1>
            Looks you've created
          </h1>
        </div>

        <span className="archive-count">
          {String(history.length).padStart(2, "0")}
          {" "}LOOKS
        </span>

      </div>

      {history.length === 0 ? (
        <div className="empty-archive">

          <div className="empty-symbol">
            ✦
          </div>

          <h2>
            Your archive is waiting.
          </h2>

          <p>
            Create your first virtual look
            and it will appear here.
          </p>

        </div>
      ) : (
        <div className="archive-grid">

          {history.map((item, index) => (
            <article
              className="archive-card"
              key={item.id || index}
            >

              <div className="archive-image">

                <img
                  src={item.url}
                  alt={`Fashion look ${index + 1}`}
                />

                <div className="archive-overlay">

                  <a
                    href={item.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    View / Download
                  </a>

                </div>

              </div>

              <div className="archive-info">

                <span>
                  LOOK{" "}
                  {String(index + 1).padStart(2, "0")}
                </span>

                <small>
                  {item.date}
                </small>

              </div>

            </article>
          ))}

        </div>
      )}

    </main>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [user, setUser] = useState(
    localStorage.getItem("fashion_user")
  );

  const [currentPage, setCurrentPage] =
    useState("home");

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "fashion_history"
        )
      ) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "fashion_history",
      JSON.stringify(history)
    );
  }, [history]);

  function handleLogin(email) {
    setUser(email);

    localStorage.setItem(
      "fashion_user",
      email
    );

    setCurrentPage("home");
  }

  function handleLogout() {
    localStorage.removeItem("fashion_user");

    setUser(null);

    setCurrentPage("home");
  }

  function addHistory(item) {
    setHistory((previous) => [
      item,
      ...previous,
    ]);
  }

  if (!user) {
    return (
      <div className="app">
        <AuthPage onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app">

      <Navbar
        user={user}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
      />

      {currentPage === "home" && (
        <Studio
          onHistoryAdd={addHistory}
        />
      )}

      {currentPage === "history" && (
        <History history={history} />
      )}

      <footer className="luxury-footer">

        <div className="footer-logo">
          AI VIRTUAL FASHION STUDIO
        </div>

        <div className="footer-line" />

        <div className="footer-bottom">
          <span>
            THE DIGITAL ATELIER
          </span>

          <span>
            © 2026
          </span>

          <span>
            ✦
          </span>
        </div>

      </footer>

    </div>
  );
}

export default App;
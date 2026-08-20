import React, { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-fashion-api-2026.onrender.com";

function Login({ onLogin, onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
  
    setError("");
    setLoading(true);
  
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid email or password."
        );
      }
  
      console.log("Login successful:", data);
  
      // Save token if your backend returns one
      if (data.access_token) {
        localStorage.setItem(
          "access_token",
          data.access_token
        );
      }
  
      // Tell App.jsx login was successful
      onLogin(email);
  
    } catch (err) {
      console.error("Login error:", err);
  
      setError(
        err.message ||
          "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (e) => {
    e.preventDefault();
  
    if (!resetEmail) {
      setResetMessage("Please enter your email address.");
      return;
    }
  
    setResetMessage("Sending reset link...");
  
    try {
      const response = await fetch(
        `${API_URL}/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: resetEmail,
          }),
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to send reset link."
        );
      }
  
      setResetMessage(
        data.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
  
    } catch (err) {
      console.error(
        "Forgot password error:",
        err
      );
  
      setResetMessage(
        err.message ||
          "Unable to connect to the backend."
      );
    }
  };
  return (
    <div className="auth-container">
      <div className="auth-card">

        <div className="auth-icon">👗</div>

        {!showForgot ? (
          <>
            <h1>Welcome Back</h1>

            <p>
              Login to your Virtual Fashion Studio
            </p>

            <form onSubmit={handleSubmit}>

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />

              <div className="forgot-password">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setError("");
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                className="primary-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

            </form>

            <p className="auth-switch">
              Don't have an account?{" "}

              <button onClick={onSignup}>
                Create Account
              </button>
            </p>
          </>
        ) : (
          <>
            <h1>Forgot Password?</h1>

            <p>
              Enter your email address and we'll help you
              reset your password.
            </p>

            <form onSubmit={handleForgotPassword}>

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your registered email"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  setResetMessage("");
                }}
              />

              {resetMessage && (
                <div className="success-message">
                  {resetMessage}
                </div>
              )}

              <button
                className="primary-btn"
                type="submit"
              >
                Send Reset Link
              </button>

            </form>

            <div className="back-login">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setResetMessage("");
                }}
              >
                ← Back to Login
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default Login;
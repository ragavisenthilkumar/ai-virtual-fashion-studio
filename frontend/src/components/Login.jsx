import React, { useState } from "react";

function Login({ onLogin, onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setError("");
    onLogin(email);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();

    if (!resetEmail) {
      setResetMessage("Please enter your email address.");
      return;
    }

    setResetMessage(
      "If an account exists with this email, a password reset link will be sent."
    );
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
                onChange={(e) => setEmail(e.target.value)}
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              >
                Login
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
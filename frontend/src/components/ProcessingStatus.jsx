import React from "react";

function ProcessingStatus({ processing, error }) {
  if (!processing && !error) {
    return null;
  }

  return (
    <div className={`processing-card ${error ? "processing-error" : ""}`}>
      {processing && (
        <>
          <div className="spinner"></div>

          <h3>AI is creating your virtual try-on...</h3>

          <p>
            Please wait while the AI processes your photo and garment.
          </p>

          <div className="progress-bar">
            <div className="progress-animation"></div>
          </div>
        </>
      )}

      {error && (
        <>
          <div className="error-icon">⚠️</div>
          <h3>Try-On Failed</h3>
          <p>{error}</p>
        </>
      )}
    </div>
  );
}

export default ProcessingStatus;
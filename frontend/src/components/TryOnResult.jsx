import React from "react";

function TryOnResult({ result, onReset }) {
  if (!result) {
    return null;
  }

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = result;
    link.download = "virtual-try-on-result.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="result-card">
      <div className="result-header">
        <div>
          <span className="success-label">✓ AI RESULT</span>
          <h2>Your Virtual Try-On</h2>
          <p>Here's how the garment looks on you.</p>
        </div>
      </div>

      <div className="result-image-container">
        <img
          src={result}
          alt="Virtual try-on result"
          className="result-image"
        />
      </div>

      <div className="result-actions">
        <button className="download-btn" onClick={handleDownload}>
          ⬇ Download Result
        </button>

        <button className="secondary-btn" onClick={onReset}>
          🔄 Try Another Outfit
        </button>
      </div>
    </div>
  );
}

export default TryOnResult;
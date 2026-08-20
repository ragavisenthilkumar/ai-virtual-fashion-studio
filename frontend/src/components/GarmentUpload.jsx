import React from "react";

function GarmentUpload({ garment, setGarment }) {
  const handleChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setGarment(file);
    }
  };

  return (
    <div className="upload-card">
      <div className="upload-header">
        <span className="step-number">2</span>
        <div>
          <h3>Upload Garment</h3>
          <p>Choose the clothing you want to try</p>
        </div>
      </div>

      <label className="upload-area">
        {garment ? (
          <div className="preview-container">
            <img
              src={URL.createObjectURL(garment)}
              alt="Garment preview"
              className="upload-preview"
            />
            <p>{garment.name}</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">👕</div>
            <strong>Click to upload</strong>
            <span>PNG, JPG or JPEG</span>
          </>
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleChange}
          hidden
        />
      </label>

      {garment && (
        <button className="remove-btn" onClick={() => setGarment(null)}>
          Remove Garment
        </button>
      )}
    </div>
  );
}

export default GarmentUpload;
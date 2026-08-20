import React from "react";

function ImageUpload({ image, setImage }) {
  const handleChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImage(file);
    }
  };

  return (
    <div className="upload-card">
      <div className="upload-header">
        <span className="step-number">1</span>
        <div>
          <h3>Upload Your Photo</h3>
          <p>Choose a clear full-body photo</p>
        </div>
      </div>

      <label className="upload-area">
        {image ? (
          <div className="preview-container">
            <img
              src={URL.createObjectURL(image)}
              alt="User preview"
              className="upload-preview"
            />
            <p>{image.name}</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📷</div>
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

      {image && (
        <button className="remove-btn" onClick={() => setImage(null)}>
          Remove Photo
        </button>
      )}
    </div>
  );
}

export default ImageUpload;
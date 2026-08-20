import React from "react";

function History({ history, onClear }) {
  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1>Try-On History</h1>
          <p>Your previous virtual fashion results</p>
        </div>

        {history.length > 0 && (
          <button className="clear-btn" onClick={onClear}>
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">👗</div>
          <h2>No try-ons yet</h2>
          <p>Your generated outfits will appear here.</p>
        </div>
      ) : (
        <div className="history-grid">
          {history.map((item, index) => (
            <div className="history-item" key={index}>
              <img
                src={item.image}
                alt={`Try-on ${index + 1}`}
              />

              <div className="history-info">
                <span>
                  {item.date || "Virtual Try-On"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;
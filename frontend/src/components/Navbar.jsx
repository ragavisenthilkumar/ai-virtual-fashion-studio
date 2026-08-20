import React from "react";

function Navbar({ user, onLogout, onHome, onHistory }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={onHome}>
        👗 AI Virtual Fashion Studio
      </div>

      <div className="navbar-links">
        {user && (
          <>
            <button onClick={onHome}>Home</button>
            <button onClick={onHistory}>History</button>
            <span className="user-name">👤 {user}</span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
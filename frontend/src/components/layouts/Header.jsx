// src/components/layouts/Header.jsx
import React from 'react'
import { FaUser, FaBell, FaCog, FaUserCircle, FaLock } from 'react-icons/fa'
import { useSelector } from "react-redux"
import "./css/header.css"

const Topnav = () => {
  const { user } = useSelector((state) => state.auth)

  return (
    <nav className="navbar bg-light sticky-top px-4 py-2 topbar">
      {/* Left: Search */}
      <form className="d-flex align-items-center" role="search" style={{ maxWidth: 360 }}>
        <input className="form-control form-control-sm me-2" type="search" placeholder="Search" aria-label="Search" />
        <button className="btn btn-outline-secondary btn-sm" type="submit">Search</button>
      </form>

      {/* Right: ONE user icon with dropdown */}
      <div className="ms-auto dropdown">
        <button
          className="icon-btn dropdown-toggle"
          id="userMenu"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-label="Open user menu"
          type="button"
        >
          <FaUser size={18} />
        </button>

        <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="userMenu">
          <li className="dropdown-item-text text-muted small px-3">
            <FaUserCircle className="me-2" />
            {user ? `${user.role} | ${user.name}` : "Staff | Guest"}
          </li>
          <li><hr className="dropdown-divider" /></li>

          {/* Optional: a simple notifications entry instead of a separate bell */}
          <li>
            <button className="dropdown-item d-flex align-items-center" type="button">
              <FaBell className="me-2" /> Notifications
            </button>
          </li>

          <li>
            <button className="dropdown-item d-flex align-items-center" type="button">
              <FaCog className="me-2" /> Profile Settings
            </button>
          </li>

          <li>
            <button className="dropdown-item d-flex align-items-center" type="button">
              <FaLock className="me-2" /> Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Topnav

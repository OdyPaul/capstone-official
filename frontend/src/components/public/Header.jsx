import React from 'react';
import { NavLink, Link } from 'react-router-dom';

function Header() {
  // NavLink helper: active link gets dark text + "active" class
  const navCls = ({ isActive }) =>
    `nav-link fw-medium ${isActive ? 'text-dark active' : 'text-secondary'}`;

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white py-3 px-5">
      {/* Brand */}
      <Link className="navbar-brand d-flex align-items-center gap-2" to="/landing-page">
        <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px' }} />
        <span className="fw-bold fs-4 text-dark">Logo</span>
      </Link>

      {/* Toggler */}
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      {/* Links */}
      <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
        <ul className="navbar-nav gap-4 align-items-lg-center">
          <li className="nav-item">
            {/* "end" so /landing-page doesn't also mark /landing-page/services as active */}
            <NavLink end to="/landing-page" className={navCls}>
              Home
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink to="/landing-page/services" className={navCls}>
              Services
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink to="/verification-portal" className={navCls}>
              Verification Portal
            </NavLink>
          </li>

          {/* Login dropdown */}
          <li className="nav-item dropdown">
            {/* Toggler for dropdown; not a router link */}
            <a
              className="nav-link dropdown-toggle fw-medium text-secondary"
              href="#"
              id="loginDropdown"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Login
            </a>
            <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="loginDropdown">
              <li>
                <NavLink to="/login" className="dropdown-item">
                  Admin Login
                </NavLink>
              </li>
              {/* add more roles later if needed
              <li><NavLink to="/student-login" className="dropdown-item">Student Login</NavLink></li>
              */}
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Header;

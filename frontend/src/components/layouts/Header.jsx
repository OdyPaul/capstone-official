import React from 'react'
import { FaUser, FaBell, FaCog, FaUserCircle, FaLock, FaEnvelopeOpenText, FaBoxOpen } from 'react-icons/fa'
import { useSelector,useDispatch } from "react-redux"



const Topnav = () => {
    const {user} = useSelector((state) => state.auth)
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light  sticky-top p-3">
      <div className="container-fluid ">
        {/* Search Form */}
        <form className="d-flex ms-3">
          <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
          <button className="btn btn-outline-dark mx-3" type="submit">
            Search
          </button>
        </form>

        {/* Right Side */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">

            {/* User Dropdown */}
            <li className="nav-item dropdown mx-2">
              <button
                className="btn btn-light border-0 dropdown-toggle"
                id="userDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaUser size={20} />
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                <li className="dropdown-item fw-bold text-primary">
                  <FaUserCircle className="me-2" />
                  {user ? `${user.role} | ${user.name}` : "Staff | Guest"}
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li className="dropdown-item">
                  <FaUserCircle className="me-2" />
                  My Profile
                </li>
                <li className="dropdown-item">
                  <FaLock className="me-2" />
                  Logout
                </li>
                <li className="dropdown-item">
                  <FaCog className="me-2" />
                  Settings
                </li>
              </ul>
            </li>

            {/* Notifications Dropdown */}
            <li className="nav-item dropdown mx-2">
              <button
                className="btn btn-light border-0 dropdown-toggle"
                id="notificationsDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaBell size={20} />
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="notificationsDropdown">
                <li className="dropdown-item">
                  <FaEnvelopeOpenText className="me-2" />
                  New message received
                </li>
                <li className="dropdown-item">
                  <FaBoxOpen className="me-2" />
                  Order shipped
                </li>
              </ul>
            </li>

            {/* Settings Dropdown */}
            <li className="nav-item dropdown mx-2">
              <button
                className="btn btn-light border-0 dropdown-toggle"
                id="settingsDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaCog size={20} />
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="settingsDropdown">
                <li className="dropdown-item">
                  <FaCog className="me-2" />
                  Profile Settings
                </li>
                <li className="dropdown-item">
                  <FaLock className="me-2" />
                  Logout
                </li>
              </ul>
            </li>

          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Topnav

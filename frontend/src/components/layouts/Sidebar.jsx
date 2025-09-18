import React, { useState,useEffect } from 'react';
import { Nav, Button } from 'react-bootstrap';
import './css/sidebar.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux'
import{logout, reset} from "../../features/auth/authSlice"

import {
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaKey,
  FaUserCheck,
  FaUsers,
  FaCogs,
  FaBoxes,
  FaInfoCircle,
  FaFolderOpen,
  FaCodeBranch,
  FaClipboardList,
  FaRegFileAlt,
} from 'react-icons/fa';


function Sidebar() {
const dispatch = useDispatch()
 const navigate = useNavigate();
const {user} = useSelector((state) => state.auth)

  useEffect (() =>{
    if(!user){
      navigate('/login')
    }
  })
    
 

  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    vcIssue: false,
    accounts: false,
  });
  const toggleSidebar = () => setCollapsed(!collapsed);

  const toggleMenu = (menu) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

    const onLogout = () =>{
        dispatch(logout())
        dispatch(reset())
        navigate('/login')
    }


  return (
    <nav className={`sidebar d-flex flex-column flex-shrink-0 position-fixed ${collapsed ? 'collapsed' : ''}`}>
      <Button
        variant="light"
        className="toggle-btn "
        onClick={toggleSidebar}
      >
        <FaChevronRight />
        
      </Button>

      <div className="p-4">
        <h4 className="logo-text fw-bold mb-0">BVC System</h4>
        {!collapsed && (
          <p className="text-muted small">Dashboard</p>
        )}
      </div>

      <Nav className="flex-column flex-grow-1">
        {/* Dashboard */}
        <Nav.Link
          as={NavLink}
          to="/"
          className="sidebar-link p-3"
        >
          <FaHome className="me-3" />
          {!collapsed && <span>Dashboard</span>}
        </Nav.Link>

        {/* VC Issue */}
        <div
          className="sidebar-link p-3 text-decoration-none"
          onClick={() => toggleMenu('vcIssue')}
          style={{ cursor: 'pointer' }}
        >
          <FaFolderOpen className="me-3" />
          {!collapsed && <span>VC</span>}
        </div>
        {expandedMenus.vcIssue && !collapsed && (
          <>
              <Nav.Link
              as={NavLink}
              to="/vc/viewVc"
              className="sidebar-link ps-5"
            >
              <FaClipboardList className="me-2" />
              <span>View Credentials</span>
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/vc/issue"
              className="sidebar-link ps-5"
            >
              <FaClipboardList className="me-2" />
              <span>Issue</span>
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/vc/request"
              className="sidebar-link ps-5"
            >
              <FaRegFileAlt className="me-2" />
              <span>Request</span>
            </Nav.Link>
          </>
        )}

        {/* Accounts */}
        <div
          className="sidebar-link p-3 text-decoration-none"
          onClick={() => toggleMenu('accounts')}
          style={{ cursor: 'pointer' }}
        >
          <FaUsers className="me-3" />
          {!collapsed && <span>Accounts</span>}
        </div>
        {expandedMenus.accounts && !collapsed && (
  <>
    {/* ✅ Always visible */}
    <Nav.Link
      as={NavLink}
      to="/accounts/verify-users"
      className="sidebar-link ps-5"
    >
      <FaUserCheck className="me-2" />
      <span>Verify Users</span>
    </Nav.Link>

    {/* ✅ Only for admin/developer */}
    {(user?.role === "admin" || user?.role === "developer") && (
      <Nav.Link
        as={NavLink}
        to="/accounts/staff-admin"
        className="sidebar-link ps-5"
      >
        <FaCogs className="me-2" />
        <span>Staffs/Admins</span>
      </Nav.Link>
    )}

    {/* ✅ Staff sees only their profile */}
    {user?.role !== "admin" && user?.role !== "developer" && (
      <Nav.Link
        as={NavLink}
        to={`/accounts/profile/${user?._id}`}
        className="sidebar-link ps-5"
      >
        <FaUsers className="me-2" />
        <span>My Profile</span>
      </Nav.Link>
    )}
  </>
)}

        {/* Key Vaults */}
        <Nav.Link
          as={NavLink}
          to="/key-vaults"
          className="sidebar-link p-3"
        >
          <FaKey className="me-3" />
          {!collapsed && <span>Key Vaults</span>}
        </Nav.Link>

        {/* Blockchain Explorer */}
        <Nav.Link
          as={NavLink}
          to="/blockchain-explorer"
          className="sidebar-link p-3"
        >
          <FaCodeBranch className="me-3" />
          {!collapsed && <span>Blockchain Explorer</span>}
        </Nav.Link>

        {/* About */}
        <Nav.Link
          as={NavLink}
          to="/about"
          className="sidebar-link p-3"
        >
          <FaInfoCircle className="me-3" />
          {!collapsed && <span>About</span>}
        </Nav.Link>
      </Nav>

      {/* ✅ Logout at bottom */}
      <div className="mt-auto p-1">
        <Button
        variant="danger"
        className="w-50 sidebar-link text-start"
        onClick={onLogout}
        >
        <FaSignOutAlt className="me-3" />
        {!collapsed && <span>Logout</span>}
        </Button>
            </div>
            </nav>
        );
}

export default Sidebar;

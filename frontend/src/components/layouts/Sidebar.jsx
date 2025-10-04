import React, { useState, useEffect } from "react";
import { Nav, Button } from "react-bootstrap";
import "./css/sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { logout, reset } from "../../features/auth/authSlice";
import { persistor } from "../../app/store"; 
import {
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaKey,
  FaUserCheck,
  FaUsers,
  FaCogs,
  FaInfoCircle,
  FaFolderOpen,
  FaCodeBranch,
  FaClipboardList,
  FaRegFileAlt,
} from "react-icons/fa";

function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    vcIssue: false,
    accounts: false,
  });

  const [submenuClickCount, setSubmenuClickCount] = useState({
    vcIssue: 0,
    accounts: 0,
  });

  const toggleSidebar = () => setCollapsed((c) => !c);

  // submenu routes based on role
  const submenuRoutes = {
    vcIssue: ["/vc/viewVc", "/vc/issue", "/vc/request"],
    accounts:
      user?.role === "admin" || user?.role === "developer"
        ? ["/accounts/verify-users", "/accounts/staff-admin"]
        : ["/accounts/verify-users", `/accounts/profile/${user?._id}`],
  };

  const toggleMenu = (menu) => {
    if (collapsed) {
      // when collapsed → cycle through submenu pages
      setSubmenuClickCount((prev) => {
        const newCount = (prev[menu] + 1) % submenuRoutes[menu].length;
        navigate(submenuRoutes[menu][newCount]);
        return { ...prev, [menu]: newCount };
      });
    } else {
      // when expanded → accordion-style submenu
      setExpandedMenus((prev) => {
        if (prev[menu]) return { ...prev, [menu]: false };

        const newState = Object.keys(prev).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {});
        newState[menu] = true;
        return newState;
      });
    }
  };

const onLogout = () => {
  dispatch(logout());
  dispatch(reset());
  persistor.purge();   // 🔑 clear ALL persisted slices (auth, vc, student, users)
  navigate("/login");
};

  return (
    <nav
      className={`sidebar d-flex flex-column flex-shrink-0 position-fixed ${
        collapsed ? "collapsed" : ""
      }`}
      aria-expanded={!collapsed}
    >
      <Button
        variant="light"
        className="toggle-btn"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </Button>

      <div className="p-4">
        <h4 className="logo-text fw-bold mb-0">BVC System</h4>
        <p className="sidebar-sub hide-on-collapse">Dashboard</p>
      </div>

      <Nav className="flex-column flex-grow-1">
        {/* Dashboard */}
        <Nav.Link as={NavLink} to="/" className="sidebar-link p-3">
          <FaHome className="me-3 icon" />
          <span className="hide-on-collapse">Dashboard</span>
        </Nav.Link>

        {/* VC Issue */}
        <div
          className="sidebar-link p-3 text-decoration-none clickable"
          onClick={() => toggleMenu("vcIssue")}
        >
          <FaFolderOpen className="me-3 icon" />
          <span className="hide-on-collapse">VC</span>
        </div>
        {expandedMenus.vcIssue && !collapsed && (
          <>
            <Nav.Link as={NavLink} to="/vc/viewVc" className="sidebar-link ps-5">
              <FaClipboardList className="me-2 icon" />
              <span>View Credentials</span>
            </Nav.Link>
            <Nav.Link as={NavLink} to="/vc/issue" className="sidebar-link ps-5">
              <FaClipboardList className="me-2 icon" />
              <span>Issue</span>
            </Nav.Link>
            <Nav.Link as={NavLink} to="/vc/request" className="sidebar-link ps-5">
              <FaRegFileAlt className="me-2 icon" />
              <span>Request</span>
            </Nav.Link>
          </>
        )}

        {/* Accounts */}
        <div
          className="sidebar-link p-3 text-decoration-none clickable"
          onClick={() => toggleMenu("accounts")}
        >
          <FaUsers className="me-3 icon" />
          <span className="hide-on-collapse">Accounts</span>
        </div>
        {expandedMenus.accounts && !collapsed && (
          <>
            <Nav.Link
              as={NavLink}
              to="/accounts/verify-users"
              className="sidebar-link ps-5"
            >
              <FaUserCheck className="me-2 icon" />
              <span>Verify Users</span>
            </Nav.Link>

            {(user?.role === "admin" || user?.role === "developer") && (
              <Nav.Link
                as={NavLink}
                to="/accounts/staff-admin"
                className="sidebar-link ps-5"
              >
                <FaCogs className="me-2 icon" />
                <span>Staffs/Admins</span>
              </Nav.Link>
            )}

            {user?.role !== "admin" && user?.role !== "developer" && (
              <Nav.Link
                as={NavLink}
                to={`/accounts/profile/${user?._id}`}
                className="sidebar-link ps-5"
              >
                <FaUsers className="me-2 icon" />
                <span>My Profile</span>
              </Nav.Link>
            )}
          </>
        )}

        {/* Key Vaults */}
        <Nav.Link as={NavLink} to="/key-vaults" className="sidebar-link p-3">
          <FaKey className="me-3 icon" />
          <span className="hide-on-collapse">Key Vaults</span>
        </Nav.Link>

        {/* Blockchain Explorer */}
        <Nav.Link
          as={NavLink}
          to="/blockchain-explorer"
          className="sidebar-link p-3"
        >
          <FaCodeBranch className="me-3 icon" />
          <span className="hide-on-collapse">Blockchain Explorer</span>
        </Nav.Link>

        {/* About */}
        <Nav.Link as={NavLink} to="/about" className="sidebar-link p-3">
          <FaInfoCircle className="me-3 icon" />
          <span className="hide-on-collapse">About</span>
        </Nav.Link>
      </Nav>

      <Button
        variant="danger"
        className="w-50 sidebar-link text-start"
        onClick={onLogout}
      >
        <FaSignOutAlt className="me-3 icon" />
        <span className="hide-on-collapse">Logout</span>
      </Button>
    </nav>
  );
}

export default Sidebar;

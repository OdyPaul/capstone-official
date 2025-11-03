// src/components/layouts/Sidebar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Nav, Button } from "react-bootstrap";
import "./css/sidebar.css";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
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
  FaUserGraduate
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Map route -> label (for tooltips)
  const routeLabel = useMemo(
    () => ({
      "/": "Dashboard",
      "/vc/draft": "Draft",
      "/vc/issue": "Issue",
      "/vc/request": "Request",
      "/registry/issuedVc": "Registry",
      "/accounts/verify-users": "Verify Users",
      "/accounts/staff-admin": "Staff/Admins",
      "/key-vaults": "Key Vaults",
      "/blockchain-explorer": "Blockchain Explorer",
      "/about": "About",
      // profiles (dynamic)
      ...(user?._id ? { [`/accounts/profile/${user._id}`]: "My Profile" } : {}),
    }),
    [user?._id]
  );

  // submenu routes based on role
  const submenuRoutes = useMemo(
    () => ({
      vcIssue: ["/vc/issue", "/vc/request", "/vc/draft"],
      accounts:
        user?.role === "admin" || user?.role === "developer" || user?.role === "superadmin"
          ? ["/accounts/verify-users", "/accounts/staff-admin"]
          : ["/accounts/verify-users", `/accounts/profile/${user?._id}`],
    }),
    [user]
  );

  // Collapsed rail-hint for VC/Accounts group buttons (shows the page that click will go to)
  const vcHint =
    routeLabel[submenuRoutes.vcIssue[submenuClickCount.vcIssue]] || "VC";
  const accountsHint =
    routeLabel[submenuRoutes.accounts[submenuClickCount.accounts]] || "Accounts";

  const toggleMenu = (menu) => {
    if (collapsed) {
      // collapsed → cycle through submenu pages
      setSubmenuClickCount((prev) => {
        const newCount = (prev[menu] + 1) % submenuRoutes[menu].length;
        navigate(submenuRoutes[menu][newCount]);
        return { ...prev, [menu]: newCount };
      });
    } else {
      // expanded → accordion
      setExpandedMenus((prev) => {
        if (prev[menu]) return { ...prev, [menu]: false };
        const allClosed = Object.keys(prev).reduce((acc, k) => {
          acc[k] = false;
          return acc;
        }, {});
        return { ...allClosed, [menu]: true };
      });
    }
  };

  return (
    <nav
      className={`sidebar d-flex flex-column flex-shrink-0 ${collapsed ? "collapsed" : ""}`}
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
        <h4 className="logo-text fw-bold mb-0">Credential Issuance</h4>
        <p className="sidebar-sub hide-on-collapse">Dashboard</p>
      </div>

      <Nav className="flex-column flex-grow-1">
        {/* Dashboard */}
        <Nav.Link
          as={NavLink}
          to="/"
          end
          className="sidebar-link p-3"
          data-label="Dashboard"
          aria-label="Dashboard"
        >
          <FaHome className="me-3 icon" />
          <span className="hide-on-collapse">Dashboard</span>
        </Nav.Link>
        {/* Students */}
        <Nav.Link
          as={NavLink}
          to="/students/student-profiles"
          end
          className="sidebar-link p-3"
          data-label="Students"
          aria-label="Students"
        >
          <FaUserGraduate className="me-3 icon" />
          <span className="hide-on-collapse">Students</span>
        </Nav.Link>

        {/* VC Group */}
        <div
          className="sidebar-link p-3 text-decoration-none clickable"
          onClick={() => toggleMenu("vcIssue")}
          data-label={collapsed ? vcHint : "VC"}
          aria-label="VC"
          role="button"
        >
          <FaFolderOpen className="me-3 icon" />
          <span className="hide-on-collapse">VC</span>
        </div>

        {expandedMenus.vcIssue && !collapsed && (
          <>
            <Nav.Link
              as={NavLink}
              to="/vc/draft"
              className="sidebar-link ps-5"
              data-label="Draft"
              aria-label="Draft"
            >
              <FaClipboardList className="me-2 icon" />
              <span>Draft</span>
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/vc/issue"
              className="sidebar-link ps-5"
              data-label="Issue"
              aria-label="Issue"
            >
              <FaClipboardList className="me-2 icon" />
              <span>Issue</span>
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/vc/request"
              className="sidebar-link ps-5"
              data-label="Request"
              aria-label="Request"
            >
              <FaRegFileAlt className="me-2 icon" />
              <span>Request</span>
            </Nav.Link>
          </>
        )}

        {/* Registry */}
        <Nav.Link
          as={NavLink}
          to="/registry/issuedVc"
          className="sidebar-link p-3"
          data-label="Registry"
          aria-label="Registry"
        >
          <FaKey className="me-3 icon" />
          <span className="hide-on-collapse">Registry</span>
        </Nav.Link>

        {/* Accounts Group */}
        <div
          className="sidebar-link p-3 text-decoration-none clickable"
          onClick={() => toggleMenu("accounts")}
          data-label={collapsed ? accountsHint : "Accounts"}
          aria-label="Accounts"
          role="button"
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
              data-label="Verify Users"
              aria-label="Verify Users"
            >
              <FaUserCheck className="me-2 icon" />
              <span>Verify Users</span>
            </Nav.Link>

            {(user?.role === "admin" || user?.role === "developer" || user?.role === "superadmin") && (
              <Nav.Link
                as={NavLink}
                to="/accounts/staff-admin"
                className="sidebar-link ps-5"
                data-label="Staff/Admins"
                aria-label="Staff/Admins"
              >
                <FaCogs className="me-2 icon" />
                <span>Staffs/Admins</span>
              </Nav.Link>
            )}

            {user?.role !== "admin" && user?.role !== "developer" && user?._id && (
              <Nav.Link
                as={NavLink}
                to={`/accounts/profile/${user._id}`}
                className="sidebar-link ps-5"
                data-label="My Profile"
                aria-label="My Profile"
              >
                <FaUsers className="me-2 icon" />
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
          data-label="Key Vaults"
          aria-label="Key Vaults"
        >
          <FaKey className="me-3 icon" />
          <span className="hide-on-collapse">Key Vaults</span>
        </Nav.Link>

        {/* Blockchain Explorer */}
        <Nav.Link
          as={NavLink}
          to="/blockchain-explorer"
          className="sidebar-link p-3"
          data-label="Blockchain Explorer"
          aria-label="Blockchain Explorer"
        >
          <FaCodeBranch className="me-3 icon" />
          <span className="hide-on-collapse">Blockchain Explorer</span>
        </Nav.Link>

      </Nav>
    </nav>
  );
}

export default Sidebar;

// src/components/layouts/CashierSidebar.jsx
import React, { useState, useEffect } from "react";
import { Nav, Button } from "react-bootstrap";
import "./css/sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaRegFileAlt,
} from "react-icons/fa";

function CashierSidebar() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const role = String(user.role || "").toLowerCase();
    if (role !== "cashier") {
      // non‑cashier users should not sit on the cashier shell
      navigate("/");
    }
  }, [user, navigate]);

  const toggleSidebar = () => setCollapsed((c) => !c);

  return (
    <nav
      className={`sidebar d-flex flex-column flex-shrink-0 ${
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
        <h4 className="logo-text fw-bold mb-0">Cashier Console</h4>
        <p className="sidebar-sub hide-on-collapse">Payments</p>
      </div>

      <Nav className="flex-column flex-grow-1">
        <Nav.Link
          as={NavLink}
          to="/cashier/drafts"
          end
          className="sidebar-link p-3"
          data-label="Drafts"
          aria-label="Drafts"
        >
          <FaClipboardList className="me-3 icon" />
          <span className="hide-on-collapse">Drafts (Unpaid)</span>
        </Nav.Link>

        <Nav.Link
          as={NavLink}
          to="/cashier/issued"
          className="sidebar-link p-3"
          data-label="Issued"
          aria-label="Issued"
        >
          <FaRegFileAlt className="me-3 icon" />
          <span className="hide-on-collapse">Issued</span>
        </Nav.Link>
      </Nav>
    </nav>
  );
}

export default CashierSidebar;

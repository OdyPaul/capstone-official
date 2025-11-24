// src/components/layouts/CashierLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import CashierSidebar from "./CashierSidebar";
import Topnav from "./Header";

function CashierLayout() {
  return (
    <>
      <CashierSidebar />
      <main className="main-content">
        <Topnav />
        <div className="container-fluid py-3">
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default CashierLayout;

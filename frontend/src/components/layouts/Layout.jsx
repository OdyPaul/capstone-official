// src/components/layouts/Layout.js
import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topnav from './Header'

function Layout() {
  return (
    <>
      <Sidebar />                 {/* fixed left */}
      <main className="main-content">
        <Topnav />                {/* sticky top inside main */}
        <div className="container-fluid py-3">
          <Outlet />              {/* renders child routes */}
        </div>
      </main>
    </>
  )
}

export default Layout

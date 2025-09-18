// src/components/layouts/Layout.js
import React from 'react'
import Sidebar from './Sidebar'
import Topnav from './Header'

function Layout({ children }) {
  return (
    <>
      <Sidebar />
      <main className="main-content">
        <Topnav />
        <div className="container-fluid">{children}</div>
      </main>
    </>
  )
}

export default Layout

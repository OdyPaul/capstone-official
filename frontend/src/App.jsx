// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AccountsAdminStaff from './pages/accounts/AccountsAdminStaff'
import Layout from './components/layouts/Layout'

import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import VerifyUsers from './pages/accounts/VerifyUsers'

// VC pages
import Issue from './pages/vc/issue'
import Draft from './pages/vc/draft'
import Request from './pages/vc/request'
import Template from './pages/vc/sub/template'
import CreateDrafts from './pages/vc/sub/createDrafts'
import DraftConfirmation from './pages/vc/sub/draftConfirmation'
import Transactions from './pages/vc/sub/transactions'
import PaymentConfirmation from './pages/vc/sub/confirmPayments'
import KeyVaults from './pages/KeyVaults'
import Blockchain from './pages/Blockchain'
import About from './pages/About'
import IssuedVc from './pages/registry/issuedVc'

function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Login route (no layout) */}
          <Route path="/login" element={<Login />} />

          {/* Routes with layout */}
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/accounts/staff-admin" element={<Layout><AccountsAdminStaff /></Layout>} />
          <Route path="/accounts/verify-users" element={<Layout><VerifyUsers /></Layout>} />

          {/* VC routes */}
          <Route path="/vc/draft" element={<Layout><Draft /></Layout>} />
          <Route path="/vc/sub/createDrafts" element={<Layout><CreateDrafts /></Layout>} />
          <Route path="/vc/sub/template" element={<Layout><Template /></Layout>} />

          <Route path="/vc/issue" element={<Layout><Issue /></Layout>} />
          <Route path="/vc/sub/draftConfirmation" element={<Layout><DraftConfirmation /></Layout>} />
          <Route path="/vc/sub/transactions" element={<Layout><Transactions /></Layout>} />
          <Route path="/issuance/payments" element={<Layout><PaymentConfirmation/></Layout>} />
          <Route path="/vc/request" element={<Layout><Request /></Layout>} />

           {/* Regirtry */}
          <Route path="/registry/issuedVc" element={<Layout><IssuedVc /></Layout>} />

          {/* Other */}
          <Route path="/key-vaults" element={<Layout><KeyVaults /></Layout>} />
          <Route path="/blockchain-explorer" element={<Layout><Blockchain /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
        </Routes>
      </Router>
      <ToastContainer />
    </>
  )
}

export default App

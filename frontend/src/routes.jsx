// src/routes.jsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layouts/Layout'
import NotFound from './pages/NotFound'

// pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AccountsAdminStaff from './pages/accounts/AccountsAdminStaff'
import VerifyUsers from './pages/accounts/VerifyUsers'
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
import Index from './pages/landing_portal'
import Verification from './pages/landing_portal/sub/verification_portal'
import Services from './pages/landing_portal/sub/services'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/landing-page" element={<Index />} />
      <Route path="/landing-page/services" element={<Services />} />
      <Route path="/verification-portal" element={<Verification />} />
      <Route path="/login" element={<Login />} />

      {/* Protected layout routes */}
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="accounts/staff-admin" element={<AccountsAdminStaff />} />
        <Route path="accounts/verify-users" element={<VerifyUsers />} />
        <Route path="vc/draft" element={<Draft />} />
        <Route path="vc/sub/createDrafts" element={<CreateDrafts />} />
        <Route path="vc/sub/template" element={<Template />} />
        <Route path="vc/issue" element={<Issue />} />
        <Route path="vc/sub/draftConfirmation" element={<DraftConfirmation />} />
        <Route path="vc/sub/transactions" element={<Transactions />} />
        <Route path="issuance/payments" element={<PaymentConfirmation />} />
        <Route path="vc/request" element={<Request />} />
        <Route path="registry/issuedVc" element={<IssuedVc />} />
        <Route path="key-vaults" element={<KeyVaults />} />
        <Route path="blockchain-explorer" element={<Blockchain />} />
        <Route path="about" element={<About />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

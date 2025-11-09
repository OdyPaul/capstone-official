// src/routes.jsx
import { Routes, Route } from 'react-router-dom';

// Shell
import Layout from './components/layouts/Layout';
import NotFound from './pages/NotFound';

// Auth / Public
import Login from './pages/Login';
import Loading from './Loading';
import Index from './pages/landing_portal';
import Verification from './pages/landing_portal/sub/verification_portal';
import Services from './pages/landing_portal/sub/services';

// App pages
import Dashboard from './pages/Dashboard';
import AccountsAdminStaff from './pages/accounts/ManageAccounts';
import VerifyUsers from './pages/accounts/VerifyUsers';
import AuditLogs from './pages/accounts/AuditLogs';

import Students from './pages/students/Profiles';
import CreateStudent from './pages/students/ManageStudent';

import Issue from './pages/vc/issue';
import Draft from './pages/vc/draft';
import Request from './pages/vc/request';
import Template from './pages/vc/sub/template';
import CreateDrafts from './pages/vc/sub/createDrafts';
import DraftConfirmation from './pages/vc/sub/draftConfirmation';
import Transactions from './pages/vc/sub/transactions';
import PaymentConfirmation from './pages/vc/sub/confirmPayments';

import KeyVaults from './pages/KeyVaults';
import Blockchain from './pages/Blockchain';
import About from './pages/About';
import IssuedVc from './pages/registry/issuedVc';
import Profile from './pages/accounts/Profile';
import Anchor  from './pages/registry/anchor';
import Anchored from './pages/registry/anchored'
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/landing-page" element={<Index />} />
      <Route path="/landing-page/services" element={<Services />} />

      {/* ✅ Portal without param (e.g. you show an instruction page) */}
      <Route path="/verification-portal" element={<Verification />} />
      {/* ✅ Portal with :sessionId param (this is the one your mobile link hits) */}
      <Route path="/verification-portal/:sessionId" element={<Verification />} />
      {/* ✅ Optional alias in case any links still use /verify/:sessionId */}
      <Route path="/verify/:sessionId" element={<Verification />} />

      <Route path="/login" element={<Login />} />
      <Route path="/loading" element={<Loading />} />

      {/* Protected (wrapped by Layout via <Outlet />) */}
      <Route element={<Layout />}>
        {/* Home */}
        <Route index element={<Dashboard />} />

        {/* Accounts */}
        <Route path="accounts/manage-accounts" element={<AccountsAdminStaff />} />
        <Route path="accounts/audit-logs/:id" element={<AuditLogs />} />
        <Route path="accounts/audit-logs" element={<AuditLogs />} />
        <Route path="accounts/verify-users" element={<VerifyUsers />} />
        <Route path="accounts/profile" element={<Profile />} />

        {/* Students */}
        <Route path="students/student-profiles" element={<Students />} />
        <Route path="students/create-student" element={<CreateStudent />} />

        {/* VC */}
        <Route path="vc/draft" element={<Draft />} />
        <Route path="vc/issue" element={<Issue />} />
        <Route path="vc/request" element={<Request />} />
        <Route path="vc/sub/createDrafts" element={<CreateDrafts />} />
        <Route path="vc/sub/template" element={<Template />} />
        <Route path="vc/sub/draftConfirmation" element={<DraftConfirmation />} />
        <Route path="vc/sub/transactions" element={<Transactions />} />
        <Route path="issuance/payments" element={<PaymentConfirmation />} />

        {/* Registry / Utilities */}
        <Route path="registry/issuedVc" element={<IssuedVc />} />
        <Route path="registry/anchor" element={<Anchor/>} />
        <Route path="registry/anchored" element={<Anchored/>} />


        <Route path="key-vaults" element={<KeyVaults />} />
        <Route path="blockchain-explorer" element={<Blockchain />} />
        <Route path="about" element={<About />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

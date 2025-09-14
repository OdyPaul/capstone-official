// src/App.js
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
import VcIssue from './pages/vc/VcIssue'
import VcRequest from './pages/vc/VcRequest'
import VerifyUsers from './pages/accounts/VerifyUsers'
import KeyVaults from './pages/KeyVaults'
import Blockchain from './pages/Blockchain'
import About from './pages/About'

function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Login route (no layout) */}
          <Route path="/login" element={<Login />} />

          {/* Routes with layout */}
          <Route path="/" element={ <Layout> <Dashboard /> </Layout>} />
          <Route path="/accounts/staff-admin" element={ <Layout> <AccountsAdminStaff /> </Layout>}/>
          <Route path="/accounts/verify-users" element={ <Layout> <VerifyUsers /> </Layout>}/>

          

          <Route path='/vc/issue' element={<Layout><VcIssue/></Layout>}> </Route>
          <Route path='/vc/request' element={<Layout><VcRequest/></Layout>}> </Route>


          <Route path='/key-vaults' element={<Layout><KeyVaults/></Layout>}> </Route>

          <Route path='/blockchain-explorer' element={<Layout><Blockchain/></Layout>}> </Route>

          <Route path='/about' element={<Layout><About/></Layout>}> </Route>




        </Routes>
      </Router>
      <ToastContainer />
    </>
  )
}

export default App

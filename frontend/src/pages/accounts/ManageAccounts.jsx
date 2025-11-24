// src/pages/accounts/ManageAccounts.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card, Row, Col, Form, Button, Badge, InputGroup, Spinner, Table, Modal
} from 'react-bootstrap';
import { FaSearch, FaCog, FaEdit, FaPlus, FaSync, FaUserPlus, FaEye } from 'react-icons/fa';
import { fetchAccounts, createAccount, updateAccount } from '../../features/accounts/accountSlice';
import { NavLink } from "react-router-dom";

const ROLES = ['admin', 'superadmin', 'developer', 'cashier'];

export default function ManageAccounts() {
  const dispatch = useDispatch();
  const { items, isLoading, isError, message } = useSelector(s => s.accounts);
  const currentUser = useSelector(s => s.auth.user);

  // ---------- CREATE ----------
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    age: '',
    address: '',
    gender: 'other',
    email: '',
    password: '',
    contactNo: '',
    role: 'admin',
    profilePicture: '',
  });

  const [imgPreview, setImgPreview] = useState('');
  const fileInputRef = useRef(null);

  const onPickImage = () => fileInputRef.current?.click();
  const onImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = window.confirm(`Use "${f.name}" as profile picture?`);
    if (!ok) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImgPreview(dataUrl);
      setForm(prev => ({ ...prev, profilePicture: String(dataUrl) }));
    };
    reader.readAsDataURL(f);
  };

  const canCreate = currentUser?.role === 'superadmin';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate) {
      alert('Only superadmin can create accounts.');
      return;
    }
    const payload = { ...form, age: form.age ? Number(form.age) : undefined };
    await dispatch(createAccount(payload)).unwrap()
      .then(() => {
        setForm({
          username: '', fullName: '', age: '', address: '', gender: 'other',
          email: '', password: '', contactNo: '', role: 'admin', profilePicture: '',
        });
        setImgPreview('');
        alert('Account created.');
        setShowCreateForm(false);
        dispatch(fetchAccounts());
      })
      .catch((err) => {
        alert(err || 'Failed to create account');
      });
  };

  // ---------- FILTERS / TABLE ----------
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => { dispatch(fetchAccounts()); }, [dispatch]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items || []).filter(u => {
      const roleOk = roleFilter === 'All' ? true : (u.role === roleFilter.toLowerCase());
      const hay = `${u.username || ''} ${u.fullName || ''} ${u.email || ''} ${u.contactNo || ''} ${u.role || ''}`.toLowerCase();
      const qOk = needle ? hay.includes(needle) : true;
      return roleOk && qOk;
    });
  }, [items, q, roleFilter]);

  // ---------- VIEW MODAL ----------
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const openView = (u) => { setSelectedUser(u); setShowViewModal(true); };
  const closeView = () => { setShowViewModal(false); setSelectedUser(null); };

  // ---------- EDIT MODAL ----------
  const canEdit = currentUser?.role === 'superadmin';
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    fullName: '',
    age: '',
    address: '',
    gender: 'other',
    email: '',
    password: '',      // optional on edit → empty = no change
    contactNo: '',
    role: 'admin',
    profilePicture: '',
  });
  const initialEditRef = useRef(null);
  const [editImgPreview, setEditImgPreview] = useState('');
  const editFileInputRef = useRef(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const onPickEditImage = () => editFileInputRef.current?.click();
  const onEditImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = window.confirm(`Use "${f.name}" as new profile picture?`);
    if (!ok) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setEditImgPreview(dataUrl);
      setEditForm(prev => ({ ...prev, profilePicture: String(dataUrl) }));
    };
    reader.readAsDataURL(f);
  };

  const openEdit = (u) => {
    if (!canEdit) return alert('Only superadmin can edit accounts.');
    const seed = {
      username: u.username || '',
      fullName: u.fullName || '',
      age: u.age ?? '',
      address: u.address || '',
      gender: u.gender || 'other',
      email: u.email || '',
      password: '',
      contactNo: u.contactNo || '',
      role: u.role || 'admin',
      profilePicture: u.profilePicture || '',
    };
    setSelectedUser(u);
    setEditForm(seed);
    setEditImgPreview(u.profilePicture || '');
    initialEditRef.current = seed;
    setShowEditModal(true);
  };

  // ---------- CONFIRM (discard) ----------
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '' });
  const confirmActionRef = useRef(null);
  const askConfirm = (title, message, onConfirm) => {
    confirmActionRef.current = onConfirm;
    setConfirmState({ show: true, title, message });
  };
  const closeConfirm = () => { setConfirmState({ show: false, title: '', message: '' }); confirmActionRef.current = null; };
  const doConfirm = () => { const fn = confirmActionRef.current; closeConfirm(); fn && fn(); };

  const hasUnsaved = () => JSON.stringify(editForm) !== JSON.stringify(initialEditRef.current || {});

  const tryCloseEdit = () => {
    if (hasUnsaved()) {
      askConfirm('Discard changes?', 'You have unsaved changes. Do you want to discard them?', () => {
        setShowEditModal(false);
        setSelectedUser(null);
      });
    } else {
      setShowEditModal(false);
      setSelectedUser(null);
    }
  };

  // ---------- NEW: Confirm Password modal (like Profile) ----------
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');

  // Open confirm-password modal when admin clicks Save Changes
  const submitEdit = () => {
    if (!selectedUser) return;
    setShowConfirmPwd(true);
  };

  // Actually save after entering current password
  const reallySaveEdit = async () => {
    if (!selectedUser) return;
    if (!confirmPwd.trim()) {
      alert('Please enter your current password to confirm.');
      return;
    }
    try {
      setIsSavingEdit(true);

      const payload = {
        ...editForm,
        age: editForm.age ? Number(editForm.age) : undefined,
        currentPassword: confirmPwd.trim(), // 🔐 pass admin’s current password
      };
      if (!payload.password) delete payload.password; // don’t overwrite if blank

      await dispatch(updateAccount({ id: selectedUser._id, data: payload })).unwrap();

      setIsSavingEdit(false);
      setShowConfirmPwd(false);
      setConfirmPwd('');
      setShowEditModal(false);
      setSelectedUser(null);
      alert('Account updated.');
      dispatch(fetchAccounts());
    } catch (err) {
      setIsSavingEdit(false);
      alert(err || 'Failed to update account');
    }
  };

  return (
    <section className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Account Management</h1>
        <div className="d-flex gap-2">
          {!showCreateForm && (
            <>
              <Button variant="success" onClick={() => setShowCreateForm(true)}>
                <FaUserPlus className="me-2" /> Create Account
              </Button>

              {/* NEW: Go to Create Student (testing) */}
              <Button
                as={NavLink}
                to="/accounts/create-student"
                end
                variant="warning"
                className="d-flex align-items-center"
                style={{ textDecoration: "none" }}
              >
                <FaUserPlus className="me-2" />
                Create Student
                <span className="ms-2 badge bg-dark">TEST</span>
              </Button>
            </>
          )}
          {showCreateForm && (
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
              Back to Table
            </Button>
          )}
          <Button variant="outline-primary" onClick={() => dispatch(fetchAccounts())}>
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Create view */}
      {showCreateForm ? (
        <Card className="mb-4">
          <Card.Header className="bg-light"><strong>Create Account</strong></Card.Header>
          <Card.Body>
            {canCreate ? (
              <Form onSubmit={onSubmit}>
                <Row>
                  <Col md={8}>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                      </Col>
                      <Col md={3}>
                        <Form.Label>Age</Form.Label>
                        <Form.Control type="number" min="0" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                      </Col>
                      <Col md={3}>
                        <Form.Label>Gender</Form.Label>
                        <Form.Select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </Form.Select>
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col md={12}>
                        <Form.Label>Address</Form.Label>
                        <Form.Control as="textarea" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Label>Email</Form.Label>
                        <Form.Control type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                      </Col>
                      <Col md={6}>
                        <Form.Label>Contact No.</Form.Label>
                        <Form.Control value={form.contactNo} onChange={e => setForm({ ...form, contactNo: e.target.value })} />
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Label>Username</Form.Label>
                        <Form.Control value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                      </Col>
                      <Col md={6}>
                        <Form.Label>Password</Form.Label>
                        <Form.Control type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Label>Role</Form.Label>
                        <Form.Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </Form.Select>
                      </Col>
                    </Row>

                    <div className="mt-3">
                      <Button type="submit" variant="primary">Create Account</Button>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="border rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: 260, position: 'relative' }}>
                      {imgPreview ? (
                        <>
                          <img
                            src={imgPreview}
                            alt="Profile"
                            style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                          />
                          <Button type="button" variant="outline-secondary" className="mt-3" onClick={onPickImage} title="Change picture">
                            <FaEdit className="me-2" /> Change
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="text-muted mb-3">No profile picture</div>
                          <Button type="button" variant="outline-dark" onClick={onPickImage}>
                            <FaPlus className="me-2" /> Add Profile
                          </Button>
                        </>
                      )}
                      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={onImageChange} />
                    </div>
                  </Col>
                </Row>
              </Form>
            ) : (
              <div className="text-muted">Only <strong>superadmin</strong> can create accounts.</div>
            )}
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* toolbar */}
          <Card className="mb-3">
            <Card.Body className="pb-2">
              <Form onSubmit={(e) => { e.preventDefault(); }} className="w-100">
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    placeholder="Search name, username, email, contact…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Form.Select
                    style={{ maxWidth: 220 }}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    title="Filter by role"
                  >
                    <option>All</option>
                    <option>admin</option>
                    <option>superadmin</option>
                    <option>developer</option>
                  </Form.Select>
                  <Button type="submit" variant="primary">Apply</Button>
                  <Button type="button" variant="outline-secondary" onClick={() => { setQ(''); setRoleFilter('All'); }}>Reset</Button>
                  <Button type="button" variant="outline-dark" onClick={() => setShowSettings(true)} title="More">
                    <FaCog />
                  </Button>
                </InputGroup>
              </Form>

              <div className="mt-2 d-flex flex-wrap gap-2">
                <Badge bg="light" text="dark">Role: {roleFilter}</Badge>
                {q ? <Badge bg="light" text="dark">q: {q}</Badge> : null}
              </div>
            </Card.Body>
          </Card>

          {/* table */}
          <Card>
            <Card.Header className="bg-light"><strong>Accounts</strong></Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Profile</th>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={8} className="text-center py-5"><Spinner animation="border" className="me-2" /> Loading…</td></tr>
                    ) : filtered.length ? (
                      filtered.map(u => (
                        <tr key={u._id}>
                          <td>
                            {u.profilePicture ? (
                              <img src={u.profilePicture} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6 }} />
                            ) : (<div className="text-muted small">—</div>)}
                          </td>
                          <td>{u.fullName || '—'}</td>
                          <td>{u.username || '—'}</td>
                          <td>{u.email || '—'}</td>
                          <td>{u.contactNo || '—'}</td>
                          <td><Badge bg="secondary">{u.role}</Badge></td>
                          <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                className="me-1"
                                onClick={() => openView(u)}
                                title="View"
                              >
                                <FaEye />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEdit(u)}
                                title="Edit"
                              >
                                <FaEdit />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={8} className="text-center py-4">No accounts found.</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {/* Settings modal */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered>
        <Modal.Header closeButton><Modal.Title>List Settings</Modal.Title></Modal.Header>
        <Modal.Body><div className="text-muted">No extra settings yet.</div></Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowSettings(false)}>Close</Button></Modal.Footer>
      </Modal>

      {/* View Profile modal (read-only) */}
      <Modal show={showViewModal} onHide={closeView} centered size="lg">
        <Modal.Header closeButton><Modal.Title>View Account</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row>
              <Col md={8}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control value={selectedUser.fullName || ''} disabled readOnly />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Age</Form.Label>
                    <Form.Control value={selectedUser.age ?? ''} disabled readOnly />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Control value={selectedUser.gender || ''} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Label>Address</Form.Label>
                    <Form.Control as="textarea" rows={2} value={selectedUser.address || ''} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control value={selectedUser.email || ''} disabled readOnly />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Contact No.</Form.Label>
                    <Form.Control value={selectedUser.contactNo || ''} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Username</Form.Label>
                    <Form.Control value={selectedUser.username || ''} disabled readOnly />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Role</Form.Label>
                    <Form.Control value={selectedUser.role || ''} disabled readOnly />
                  </Col>
                </Row>
              </Col>

              <Col md={4}>
                <div className="border rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: 260 }}>
                  {selectedUser.profilePicture ? (
                    <img
                      src={selectedUser.profilePicture}
                      alt="Profile"
                      style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                    />
                  ) : (
                    <div className="text-muted">No profile picture</div>
                  )}
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeView}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Profile modal */}
      <Modal show={showEditModal} onHide={tryCloseEdit} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Edit Account</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); submitEdit(); }}>
            <Row>
              <Col md={8}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Age</Form.Label>
                    <Form.Control type="number" min="0" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Label>Address</Form.Label>
                    <Form.Control as="textarea" rows={2} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Contact No.</Form.Label>
                    <Form.Control value={editForm.contactNo} onChange={e => setEditForm({ ...editForm, contactNo: e.target.value })} />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Username</Form.Label>
                    <Form.Control value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required />
                  </Col>
                  <Col md={6}>
                    <Form.Label>New Password (optional)</Form.Label>
                    <Form.Control type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Role</Form.Label>
                    <Form.Select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </Form.Select>
                  </Col>
                </Row>
              </Col>

              <Col md={4}>
                <div className="border rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: 260 }}>
                  {editImgPreview ? (
                    <>
                      <img
                        src={editImgPreview}
                        alt="Profile"
                        style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                      />
                      <Button type="button" variant="outline-secondary" className="mt-3" onClick={onPickEditImage}>
                        <FaEdit className="me-2" /> Change
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-muted mb-3">No profile picture</div>
                      <Button type="button" variant="outline-dark" onClick={onPickEditImage}>
                        <FaPlus className="me-2" /> Add Profile
                      </Button>
                    </>
                  )}
                  <input type="file" accept="image/*" ref={editFileInputRef} style={{ display: 'none' }} onChange={onEditImageChange} />
                </div>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={tryCloseEdit}>Cancel</Button>
          <Button variant="primary" onClick={submitEdit} disabled={isSavingEdit}>
            {isSavingEdit ? <Spinner animation="border" size="sm" className="me-2" /> : null}
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm modal (discard) */}
      <Modal show={confirmState.show} onHide={closeConfirm} centered>
        <Modal.Header closeButton><Modal.Title>{confirmState.title || 'Confirm'}</Modal.Title></Modal.Header>
        <Modal.Body>{confirmState.message || 'Are you sure?'}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeConfirm}>Cancel</Button>
          <Button variant="primary" onClick={doConfirm}>Confirm</Button>
        </Modal.Footer>
      </Modal>

      {/* 🔐 Confirm Password modal for saving edits */}
      <Modal show={showConfirmPwd} onHide={() => setShowConfirmPwd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Current password required to perform admin updates.</p>
          <Form.Control
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Enter your current password"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); reallySaveEdit(); } }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmPwd(false)}>Cancel</Button>
          <Button variant="primary" onClick={reallySaveEdit} disabled={isSavingEdit}>
            {isSavingEdit ? <Spinner animation="border" size="sm" className="me-2" /> : null}
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {isError && <div className="alert alert-danger mt-3">{message}</div>}
    </section>
  );
}

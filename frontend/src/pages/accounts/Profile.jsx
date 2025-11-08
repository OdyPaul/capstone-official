// src/pages/accounts/Profile.jsx
import React, { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Row, Col, Form, Button, Badge, Spinner, Modal } from 'react-bootstrap';
import { FaEdit, FaPlus } from 'react-icons/fa';
// ⬇️ fix import: file is accountsSlice.js (plural)
import { updateAccount } from '../../features/accounts/accountSlice';
import { setUser } from '../../features/auth/authSlice';

const ROLES = ['admin', 'superadmin', 'developer'];

export default function Profile() {
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const accountsLoading = useSelector((s) => s.accounts.isLoading);

  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState(() => ({
    username: me?.username || '',
    fullName: me?.fullName || '',
    age: me?.age ?? '',
    address: me?.address || '',
    gender: me?.gender || 'other',
    email: me?.email || '',
    password: '', // optional new password
    contactNo: me?.contactNo || '',
    role: me?.role || 'admin',
    profilePicture: me?.profilePicture || '',
  }));

  const [imgPreview, setImgPreview] = useState(me?.profilePicture || '');
  const fileInputRef = useRef(null);
  const onPickImage = () => fileInputRef.current?.click();
  const onImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImgPreview(dataUrl);
      setForm((prev) => ({ ...prev, profilePicture: String(dataUrl) }));
    };
    reader.readAsDataURL(f);
  };

  const canChangeRole = me?.role === 'superadmin';

  // ===== Confirm password modal (now used for ALL roles) =====
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

 // replace the whole reallySave with this version
const reallySave = async () => {
  if (!me?._id) return;
  if (!confirmPwd.trim()) {
    alert('Please enter your current password to confirm.');
    return;
  }

  try {
    setSaving(true);

    const payload = {
      ...form,
      age: form.age ? Number(form.age) : undefined,
      currentPassword: confirmPwd.trim(),
    };
    if (!payload.password) delete payload.password;     // don’t overwrite if blank
    if (!canChangeRole) delete payload.role;            // non-superadmin cannot change role

    // run the update
    const updated = await dispatch(updateAccount({ id: me._id, data: payload })).unwrap();

    // 🔥 hydrate header immediately if you updated yourself
    if (updated && me && updated._id === me._id) {
      const next = {
        ...me, // keep token and any fields your API doesn't return
        username: updated.username ?? me.username,
        fullName: updated.fullName ?? me.fullName,
        email: updated.email ?? me.email,
        role: updated.role ?? me.role,
        profilePicture: updated.profilePicture ?? me.profilePicture,
        contactNo: updated.contactNo ?? me.contactNo,
        gender: updated.gender ?? me.gender,
        address: updated.address ?? me.address,
        age: (typeof updated.age !== 'undefined') ? updated.age : me.age,
      };
      try { localStorage.setItem('user', JSON.stringify(next)); } catch {}
      dispatch(setUser(next));
    }

    alert('Profile updated');
    setEditMode(false);
    setConfirmPwd('');
  } catch (err) {
    alert(err || 'Failed to update profile');
  } finally {
    setSaving(false);
  }
};


  const onClickSave = (e) => {
    e.preventDefault();
    // ⬇️ Always require current password to satisfy backend rule
    setShowConfirm(true);
  };

  const headerBadge = useMemo(
    () => <Badge bg="secondary" className="ms-2">{me?.role || 'staff'}</Badge>,
    [me?.role]
  );

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">My Profile {headerBadge}</h1>
        {!editMode ? (
          <Button variant="primary" onClick={() => setEditMode(true)}>
            <FaEdit className="me-2" /> Edit Profile
          </Button>
        ) : (
          <div className="d-flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditMode(false);
                setForm({
                  username: me?.username || '',
                  fullName: me?.fullName || '',
                  age: me?.age ?? '',
                  address: me?.address || '',
                  gender: me?.gender || 'other',
                  email: me?.email || '',
                  password: '',
                  contactNo: me?.contactNo || '',
                  role: me?.role || 'admin',
                  profilePicture: me?.profilePicture || '',
                });
                setImgPreview(me?.profilePicture || '');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={saving || accountsLoading}
              onClick={onClickSave}
              title="Current password required to perform admin updates"
            >
              {saving || accountsLoading ? <Spinner animation="border" size="sm" className="me-2" /> : null}
              Update
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-4">
        <Card.Header className="bg-light"><strong>View / Edit</strong></Card.Header>
        <Card.Body>
          {!me ? (
            <div className="text-muted">You are not logged in.</div>
          ) : (
            <Form>
              <Row>
                <Col md={8}>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control value={form.fullName} disabled={!editMode} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </Col>
                    <Col md={3}>
                      <Form.Label>Age</Form.Label>
                      <Form.Control type="number" min="0" value={form.age} disabled={!editMode} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                    </Col>
                    <Col md={3}>
                      <Form.Label>Gender</Form.Label>
                      <Form.Select value={form.gender} disabled={!editMode} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={12}>
                      <Form.Label>Address</Form.Label>
                      <Form.Control as="textarea" rows={2} value={form.address} disabled={!editMode} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" value={form.email} disabled={!editMode} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Contact No.</Form.Label>
                      <Form.Control value={form.contactNo} disabled={!editMode} onChange={(e) => setForm({ ...form, contactNo: e.target.value })} />
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Username</Form.Label>
                      <Form.Control value={form.username} disabled={!editMode} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                    </Col>
                    <Col md={6}>
                      <Form.Label>New Password (optional)</Form.Label>
                      <Form.Control type="password" value={form.password} disabled={!editMode} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" />
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Role</Form.Label>
                      <Form.Select disabled={!editMode || !canChangeRole} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Form.Select>
                      {!canChangeRole && <div className="form-text">Only superadmin can change roles.</div>}
                    </Col>
                  </Row>
                </Col>

                <Col md={4}>
                  <div className="border rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: 260 }}>
                    {imgPreview ? (
                      <>
                        <img
                          src={imgPreview}
                          alt="Profile"
                          style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                        />
                        <Button type="button" variant="outline-secondary" className="mt-3" onClick={onPickImage} disabled={!editMode}>
                          <FaEdit className="me-2" /> Change
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-muted mb-3">No profile picture</div>
                        <Button type="button" variant="outline-dark" onClick={onPickImage} disabled={!editMode}>
                          <FaPlus className="me-2" /> Add Profile
                        </Button>
                      </>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={onImageChange} />
                  </div>
                </Col>
              </Row>
            </Form>
          )}
        </Card.Body>
      </Card>

      {/* ===== Confirm Password Modal (always shown on Update) ===== */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Update</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Current password required to perform admin updates.
          </p>
          <Form.Control
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Enter your current password"
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!confirmPwd.trim()) return;
              setShowConfirm(false);
              reallySave();
            }}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

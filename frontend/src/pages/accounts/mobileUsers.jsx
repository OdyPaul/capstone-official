// src/pages/accounts/mobileUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Badge,
  InputGroup,
  Spinner,
  Table,
  Modal,
} from "react-bootstrap";
import {
  FaSearch,
  FaSync,
  FaEye,
  FaArrowLeft,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import {
  fetchMobileAccounts,
  updateMobileAccount,
  deleteMobileAccount,
} from "../../features/accounts/mobileAccountSlice";

const VERIFIED_OPTIONS = ["unverified", "verified", "rejected"];

export default function MobileUsers() {
  const dispatch = useDispatch();

  // from slice
  const { items, isLoading, isError, message } = useSelector(
    (s) => s.mobileAccounts || { items: [], isLoading: false, isError: false, message: "" }
  );
  const currentUser = useSelector((s) => s.auth.user);

  // permissions
  const canEdit = ["admin", "superadmin", "developer"].includes(
    currentUser?.role
  );
  const canDelete = currentUser?.role === "superadmin";

  // filters
  const [q, setQ] = useState("");

  // view modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    contactNo: "",
    verified: "unverified",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // delete confirm
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // load list on mount
  useEffect(() => {
    dispatch(fetchMobileAccounts());
  }, [dispatch]);

  const onRefresh = () => {
    dispatch(fetchMobileAccounts());
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items || []).filter((u) => {
      const hay = `${u.username || ""} ${u.fullName || ""} ${
        u.email || ""
      } ${u.contactNo || ""} ${u.role || ""} ${u.verified || ""} ${
        u.kind || ""
      }`.toLowerCase();
      return needle ? hay.includes(needle) : true;
    });
  }, [items, q]);

  const statusVariant = (v) =>
    v === "verified" ? "success" : v === "rejected" ? "danger" : "secondary";

  /* ---------- View ---------- */

  const openView = (u) => {
    setSelectedUser(u);
    setShowViewModal(true);
  };

  const closeView = () => {
    setShowViewModal(false);
    setSelectedUser(null);
  };

  /* ---------- Edit ---------- */

  const openEdit = (u) => {
    if (!canEdit) {
      alert("You are not allowed to edit mobile accounts.");
      return;
    }
    setSelectedUser(u);
    setEditForm({
      username: u.username || "",
      fullName: u.fullName || "",
      email: u.email || "",
      password: "",
      contactNo: u.contactNo || "",
      verified: u.verified || "unverified",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!canEdit) {
      alert("You are not allowed to edit mobile accounts.");
      return;
    }

    try {
      setSavingEdit(true);

      const payload = {
        ...editForm,
      };
      // if password left blank, don't send it (keep current)
      if (!payload.password) {
        delete payload.password;
      }

      await dispatch(
        updateMobileAccount({ id: selectedUser._id, data: payload })
      ).unwrap();

      alert("Mobile user updated.");
      setShowEditModal(false);
      setSelectedUser(null);
      dispatch(fetchMobileAccounts());
    } catch (err) {
      alert(err || "Failed to update mobile user");
    } finally {
      setSavingEdit(false);
    }
  };

  /* ---------- Delete ---------- */

  const openDelete = (u) => {
    if (!canDelete) {
      alert("Only superadmin can delete mobile accounts.");
      return;
    }
    setDeleteTarget(u);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await dispatch(deleteMobileAccount(deleteTarget._id)).unwrap();
      alert("Mobile user deleted.");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      dispatch(fetchMobileAccounts());
    } catch (err) {
      alert(err || "Failed to delete mobile user");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Button
            as={NavLink}
            to="/accounts/verify-users"
            variant="outline-secondary"
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" />
            Back to Verify Users
          </Button>
        </div>

        <h1 className="h4 mb-0">Mobile Accounts</h1>

        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={onRefresh}>
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="mb-3">
        <Card.Body className="pb-2">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="w-100"
          >
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by username, email, name, status…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setQ("")}
              >
                Reset
              </Button>
            </InputGroup>
          </Form>

          <div className="mt-2 d-flex flex-wrap gap-2">
            <Badge bg="light" text="dark">
              q: {q || "(empty)"}
            </Badge>
            <Badge bg="light" text="dark">
              Showing: {filtered.length} / {items?.length || 0}
            </Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card>
        <Card.Header className="bg-light">
          <strong>Mobile Users</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Created</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" className="me-2" /> Loading…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((u) => (
                    <tr key={u._id}>
                      <td>{u.username || "—"}</td>
                      <td>{u.fullName || "—"}</td>
                      <td>{u.email || "—"}</td>
                      <td>
                        <Badge bg="secondary">{u.role || "student"}</Badge>
                      </td>
                      <td>
                        <Badge bg={statusVariant(u.verified || "unverified")}>
                          {u.verified || "unverified"}
                        </Badge>
                      </td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => openView(u)}
                            title="View details"
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openEdit(u)}
                            title="Edit mobile user"
                            disabled={!canEdit}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => openDelete(u)}
                            title="Delete"
                            disabled={!canDelete}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No mobile accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* View modal */}
      <Modal show={showViewModal} onHide={closeView} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>View Mobile Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row>
              <Col md={8}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      value={selectedUser.username || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      value={selectedUser.email || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      value={selectedUser.fullName || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Role</Form.Label>
                    <Form.Control
                      value={selectedUser.role || "student"}
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Verified Status</Form.Label>
                    <Form.Control
                      value={selectedUser.verified || "unverified"}
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Kind</Form.Label>
                    <Form.Control
                      value={selectedUser.kind || "mobile"}
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Contact No.</Form.Label>
                    <Form.Control
                      value={selectedUser.contactNo || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Created At</Form.Label>
                    <Form.Control
                      value={
                        selectedUser.createdAt
                          ? new Date(
                              selectedUser.createdAt
                            ).toLocaleString()
                          : ""
                      }
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Updated At</Form.Label>
                    <Form.Control
                      value={
                        selectedUser.updatedAt
                          ? new Date(
                              selectedUser.updatedAt
                            ).toLocaleString()
                          : ""
                      }
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeView}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Mobile User modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Mobile User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Username</Form.Label>
                <Form.Control
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      username: e.target.value,
                    }))
                  }
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>New Password (optional)</Form.Label>
                <Form.Control
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Leave blank to keep current"
                />
              </Col>
              <Col md={6}>
                <Form.Label>Contact No.</Form.Label>
                <Form.Control
                  value={editForm.contactNo}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      contactNo: e.target.value,
                    }))
                  }
                />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      fullName: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col md={6}>
                <Form.Label>Verified</Form.Label>
                <Form.Select
                  value={editForm.verified}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      verified: e.target.value,
                    }))
                  }
                >
                  {VERIFIED_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            <div className="text-end">
              <Button
                type="submit"
                variant="primary"
                disabled={savingEdit || !canEdit}
              >
                {savingEdit ? (
                  <Spinner animation="border" size="sm" className="me-2" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Mobile User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteTarget ? (
            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.username || deleteTarget.email}</strong>?
            </p>
          ) : (
            <p>Are you sure?</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting || !canDelete}
          >
            {deleting ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {isError && (
        <div className="alert alert-danger mt-3">{message || "Error"}</div>
      )}
    </section>
  );
}

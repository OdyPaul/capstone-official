import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form,              // ✅ added
} from "react-bootstrap";
import { FaSync, FaTrash } from "react-icons/fa";
import { getAllRequests, deleteRequest } from "../../features/request/requestsSlice";
import { NavLink } from "react-router-dom";

// ✅ same style as IssuedVc
const PAGE_SIZES = [10, 20, 50, 100];

function Request() {
  const dispatch = useDispatch();

  const {
    items = [],
    isLoading = false,
    isUpdating = false,
    isError = false,
    message = "",
  } = useSelector((s) => s.requests || {});

  const [statusFilter, setStatusFilter] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // confirm modal state (only for delete now)
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const closeConfirm = () => {
    setShowConfirm(false);
    setTargetRow(null);
  };

  useEffect(() => {
    dispatch(getAllRequests({}));
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return (items || []).filter((r) => r.status === statusFilter);
  }, [items, statusFilter]);

  const shortId = (v) => {
    const s = String(v || "");
    return s.length > 8 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s || "—";
  };

  const openDeleteConfirm = (row) => {
    setTargetRow(row);
    setShowConfirm(true);
  };

  const doDelete = async () => {
    if (!targetRow?._id) return;
    try {
      await dispatch(deleteRequest(targetRow._id)).unwrap();
    } finally {
      closeConfirm();
    }
  };

  const statusVariant = (s) =>
    s === "pending"
      ? "warning"
      : s === "approved"
      ? "success"
      : s === "rejected"
      ? "danger"
      : s === "issued"
      ? "info"
      : "secondary";

  // ✅ pagination derived from filtered list
  const total = filtered.length;
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(0, total) / Math.max(1, limit))
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  // ✅ clamp page when data/limit changes
  useEffect(() => {
    const pc = Math.max(
      1,
      Math.ceil(Math.max(0, total) / Math.max(1, limit))
    );
    if (page > pc) setPage(pc);
  }, [total, limit, page]);

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">VC Requests</h1>
        <div className="d-flex gap-2">
          <select
            className="form-select"
            style={{ width: 220 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // ✅ reset to first page when filter changes
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="issued">issued</option>
          </select>
          <Button
            variant="outline-primary"
            onClick={() => dispatch(getAllRequests({}))}
          >
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {isError ? <Alert variant="danger">{String(message)}</Alert> : null}

      <Card>
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <strong>Requests</strong>
          <Badge bg="secondary">{total}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Created</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Anchor now</th>
                  <th>Draft</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : pageRows.length ? (
                  pageRows.map((r) => (
                    <tr key={r._id}>
                      <td>
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        {r.profileId ? (
                          <NavLink
                            to={`/students/${r.profileId}`}
                            className="text-decoration-none"
                          >
                            {r.studentNumber || shortId(r.profileId)}
                          </NavLink>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="d-flex align-items-center gap-2">
                        {r.photoUrl ? (
                          <img
                            src={r.photoUrl}
                            alt=""
                            style={{
                              width: 32,
                              height: 32,
                              objectFit: "cover",
                              borderRadius: 6,
                            }}
                          />
                        ) : (
                          <div className="text-muted small">—</div>
                        )}
                        <span>{r.fullName || "—"}</span>
                      </td>
                      <td>{r.program || "—"}</td>
                      <td>
                        <Badge bg="dark">
                          {r.vcType || String(r.type || "").toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span className="text-muted">
                          {r.vcPurpose || r.purpose || "—"}
                        </span>
                      </td>

                      {/* Anchor now */}
                      <td>
                        <Badge bg={r.anchorNow ? "info" : "secondary"}>
                          {r.anchorNow ? "Yes" : "No"}
                        </Badge>
                      </td>

                      {/* Draft info */}
                      <td>
                        {r.draft ? (
                          <Badge bg="success" title={String(r.draft)}>
                            Draft: {shortId(r.draft)}
                          </Badge>
                        ) : (
                          <Badge bg="light" text="dark">
                            None
                          </Badge>
                        )}
                      </td>

                      <td>
                        <Badge bg={statusVariant(r.status || "pending")}>
                          {r.status || "pending"}
                        </Badge>
                      </td>

                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={isUpdating}
                            onClick={() => openDeleteConfirm(r)}
                            title="Delete request"
                          >
                            <FaTrash className="me-1" /> Trash
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      No requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* ✅ pagination footer copied from IssuedVc style */}
        <Card.Footer className="d-flex align-items-center justify-content-between">
          <div className="text-muted small">
            Page {page} of {pageCount}
            {total ? ` • Total ${total}` : ""}
          </div>
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPage(1)}
              disabled={page <= 1}
            >
              « First
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹ Prev
            </Button>
            <Form.Select
              size="sm"
              style={{ width: 90 }}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </Form.Select>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next ›
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount}
            >
              Last »
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Delete confirm modal */}
      <Modal show={showConfirm} onHide={closeConfirm} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {targetRow ? (
            <>
              <div className="mb-2">
                <div className="text-muted small">Student</div>
                <div className="fw-semibold">
                  {targetRow.fullName || "—"}
                </div>
                <div className="text-muted small">
                  {(targetRow.studentNumber || "—")} •{" "}
                  {(targetRow.program || "—")}
                </div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Request</div>
                <div>
                  <strong>Type:</strong>{" "}
                  {targetRow.vcType ||
                    String(targetRow.type || "").toUpperCase() ||
                    "—"}
                </div>
                <div>
                  <strong>Purpose:</strong>{" "}
                  {targetRow.vcPurpose || targetRow.purpose || "—"}
                </div>
                <div>
                  <strong>Anchor now:</strong>{" "}
                  {targetRow.anchorNow ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Draft:</strong>{" "}
                  {targetRow.draft ? shortId(targetRow.draft) : "None"}
                </div>
              </div>
              <hr />
              <div>
                This will permanently delete the request record. Drafts and
                payments are managed separately. Continue?
              </div>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={doDelete}
            disabled={isUpdating || !targetRow}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

export default Request;

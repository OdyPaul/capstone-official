// src/pages/PaymentConfirmation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import {
  Button,
  Card,
  Table,
  Spinner,
  Row,
  Col,
  Form,
  InputGroup,
  Badge,
  Modal,
  Alert,
} from "react-bootstrap";
import {
  FaArrowLeft,
  FaSync,
  FaEye,
  FaMoneyCheckAlt,
} from "react-icons/fa";
import {
  fetchUnpaidPayments,
  confirmPayment,
  resetPaymentError,
} from "../../../features/payments/paymentSlice";

const PAGE_SIZES = [10, 20, 50, 100];

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");
const fmtDate = (v) =>
  v ? (v === "N/A" ? "N/A" : new Date(v).toLocaleDateString()) : "—";

const statusBadgeVariant = (st) => {
  if (st === "anchored") return "success";
  if (st === "signed") return "primary";
  if (st === "void") return "danger";
  if (st === "issued") return "secondary";
  return "secondary";
};

/* ------------------------- Details / View modal ------------------------- */
function IssueDetailsModal({ show, onHide, issue }) {
  if (!issue) return null;
  const s = issue.student || {};
  const t = issue.template || {};

  const fullName =
    s.fullName ||
    `${s.lastName || ""}, ${s.firstName || ""}${
      s.middleName ? " " + s.middleName : ""
    }`.trim() ||
    "—";

  const anchorNow = issue.anchorNow === true;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Issuance Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Student block */}
        <h5 className="mb-2">Student</h5>
        <div className="mb-2">
          <strong>Name:</strong>{" "}
          <span className="text-muted">{fullName}</span>
        </div>
        <div className="mb-2">
          <strong>Student No.:</strong>{" "}
          <span className="text-muted">{s.studentNumber || "—"}</span>
        </div>
        <div className="mb-2">
          <strong>Program:</strong>{" "}
          <span className="text-muted">
            {s.program || issue.program || "—"}
          </span>
        </div>
        <div className="mb-3">
          <strong>Date Graduated:</strong>{" "}
          <span className="text-muted">
            {fmtDate(s.dateGraduated || issue.dateGraduated)}
          </span>
        </div>

        <hr />

        {/* Issuance block */}
        <h5 className="mb-2">Issuance</h5>
        <div className="mb-2">
          <strong>Created:</strong>{" "}
          <span className="text-muted">
            {fmtDateTime(issue.createdAt)}
          </span>
        </div>
        <div className="mb-2">
          <strong>Type:</strong>{" "}
          <span className="text-muted">{issue.type || "—"}</span>
        </div>
        <div className="mb-2">
          <strong>Purpose:</strong>{" "}
          <span className="text-muted">{issue.purpose || "—"}</span>
        </div>
        <div className="mb-2 d-flex align-items-center gap-2">
          <strong className="mb-0">Status:</strong>
          <Badge bg={statusBadgeVariant(issue.status)}>
            {issue.status || "issued"}
          </Badge>
        </div>
        <div className="mb-2">
          <strong>Expiration:</strong>{" "}
          <span className="text-muted">
            {fmtDate(issue.expiration)}
          </span>
        </div>
        <div className="mb-2">
          <strong>Amount:</strong>{" "}
          <span className="text-muted">
            {issue.amount != null ? issue.amount : "—"}{" "}
            {issue.currency || "PHP"}
          </span>
        </div>
        <div className="mb-2">
          <strong>Order No.:</strong>{" "}
          <span className="text-muted">
            {issue.order_no || "—"}
          </span>
        </div>
        <div className="mb-2">
          <strong>Receipt No.:</strong>{" "}
          <span className="text-muted">
            {issue.receipt_no || "—"}
          </span>
        </div>
        <div className="mb-0">
          <strong>Anchor Today:</strong>{" "}
          <span className="text-muted">
            {anchorNow ? "Yes (queue for anchoring when paid)" : "No"}
          </span>
        </div>

        {/* Template */}
        {t && Object.keys(t).length > 0 && (
          <>
            <hr />
            <h5 className="mb-2">Template</h5>
            <div className="mb-2">
              <strong>Name:</strong>{" "}
              <span className="text-muted">
                {t.name || t.slug || "—"}
              </span>
            </div>
            <div className="mb-2">
              <strong>Version:</strong>{" "}
              <span className="text-muted">
                {t.version || "—"}
              </span>
            </div>
            <div className="mb-0">
              <strong>Base Price:</strong>{" "}
              <span className="text-muted">
                {t.price != null ? t.price : "—"} PHP
              </span>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ----------------------- Confirm payment modal ----------------------- */
function ConfirmPaymentModal({
  show,
  onCancel,
  onConfirm, // (amount: number, anchorNow: boolean) => void
  issue,
  isSaving,
  error,
}) {
  const s = issue?.student || {};
  const fullName =
    s.fullName ||
    `${s.lastName || ""}, ${s.firstName || ""}${
      s.middleName ? " " + s.middleName : ""
    }`.trim() ||
    "—";

  const [amount, setAmount] = useState(issue?.amount || 250);
  const [anchorNow, setAnchorNow] = useState(issue?.anchorNow === true);

  useEffect(() => {
    setAmount(issue?.amount || 250);
    setAnchorNow(issue?.anchorNow === true);
  }, [issue, show]);

  if (!issue) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      return;
    }
    onConfirm(num, anchorNow);
  };

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            You are about to confirm payment for:
          </p>
          <ul className="mb-3">
            <li>
              <strong>Student:</strong> {fullName}{" "}
              {s.studentNumber ? `(#${s.studentNumber})` : ""}
            </li>
            <li>
              <strong>Type:</strong> {issue.type || "—"}
            </li>
            <li>
              <strong>Program:</strong>{" "}
              {s.program || issue.program || "—"}
            </li>
            <li>
              <strong>Current status:</strong>{" "}
              {issue.status || "issued"}
            </li>
          </ul>

          <Form.Group className="mb-3">
            <Form.Label>Payment Amount (PHP)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Form.Text className="text-muted">
              Default is <strong>250</strong>. You can adjust if needed.
            </Form.Text>
          </Form.Group>

          <Form.Group>
            <Form.Check
              type="switch"
              id="anchor-now-switch"
              label="Anchor today (queue anchoring right after signing)"
              checked={anchorNow}
              onChange={(e) => setAnchorNow(e.target.checked)}
            />
          </Form.Group>

          <Alert variant="info" className="mt-3 mb-0">
            After confirming, this issuance will be{" "}
            <strong>paid and signed</strong>, and ready for claiming.
          </Alert>

          {error ? (
            <div className="text-danger mt-2">{String(error)}</div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner
                  size="sm"
                  animation="border"
                  className="me-2"
                />
                Saving…
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/* --------------------------- Page Component --------------------------- */

export default function PaymentConfirmation() {
  const dispatch = useDispatch();
  const {
    items,
    isLoadingList,
    isErrorList,
    listMessage,
    isSavingPayment,
    saveError,
  } = useSelector((s) => s.payments || {});

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsIssue, setDetailsIssue] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(null);

  useEffect(() => {
    dispatch(fetchUnpaidPayments()); // unpaidOnly=true is inside service
  }, [dispatch]);

  // Backend already returns ISSUED + UNPAID when unpaidOnly=true,
  // but keep this guard for safety.
  const baseRows = useMemo(() => {
    return (items || []).filter(
      (i) =>
        (!i.receipt_no || i.receipt_no === "") &&
        ((i.status || "issued") === "issued")
    );
  }, [items]);

  const filtered = useMemo(() => {
    if (!q.trim()) return baseRows;
    const needle = q.toLowerCase();
    return baseRows.filter((issue) => {
      const s = issue.student || {};
      const fullName =
        s.fullName ||
        `${s.lastName || ""}, ${s.firstName || ""}${
          s.middleName ? " " + s.middleName : ""
        }`.trim();
      return (
        (s.studentNumber || "").toLowerCase().includes(needle) ||
        (fullName || "").toLowerCase().includes(needle) ||
        (issue.type || "").toLowerCase().includes(needle) ||
        (s.program || issue.program || "").toLowerCase().includes(needle)
      );
    });
  }, [baseRows, q]);

  const total = filtered.length;
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(0, total) / Math.max(1, limit))
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  useEffect(() => {
    const pc = Math.max(
      1,
      Math.ceil(Math.max(0, total) / Math.max(1, limit))
    );
    if (page > pc) setPage(pc);
  }, [total, limit, page]);

  const openDetails = (issue) => {
    setDetailsIssue(issue);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setDetailsIssue(null);
    setShowDetails(false);
  };

  const openConfirm = (issue) => {
    setConfirmIssue(issue);
    setShowConfirm(true);
    dispatch(resetPaymentError());
  };

  const closeConfirm = () => {
    setConfirmIssue(null);
    setShowConfirm(false);
    dispatch(resetPaymentError());
  };

  const handleConfirmPayment = async (amount, anchorNow) => {
    if (!confirmIssue?._id) return;
    try {
      await dispatch(
        confirmPayment({
          issueId: confirmIssue._id,
          amount,
          anchorNow,
        })
      ).unwrap();
      closeConfirm();
      // Reload list after successful payAndSign → issue should be "signed" and disappear
      dispatch(fetchUnpaidPayments());
    } catch {
      // error already stored in saveError
    }
  };

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <Button as={NavLink} to="/vc/issue" variant="outline-secondary">
          <FaArrowLeft className="me-2" />
          Back to Issuance
        </Button>
        <h1 className="h5 mb-0">Confirm Payments (Issued & Unpaid)</h1>
        <Button
          variant="outline-primary"
          onClick={() => dispatch(fetchUnpaidPayments())}
          disabled={isLoadingList}
        >
          <FaSync className="me-2" /> Reload
        </Button>
      </div>

      {/* global errors */}
      {isErrorList && listMessage && (
        <Alert
          variant="danger"
          className="mb-3"
          onClose={() => dispatch(resetPaymentError())}
          dismissible
        >
          {String(listMessage)}
        </Alert>
      )}

      {/* search + info */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  placeholder="student no, name, type, program…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="text-end">
              <Badge bg="secondary">
                Issued & unpaid: {baseRows.length}
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* main table: Student #, Name, Type, Program, Actions */}
      <Card>
        <Card.Header className="bg-light">
          <strong>Issued Credentials (Unpaid)</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student #</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Program</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : pageRows.length > 0 ? (
                  pageRows.map((issue) => {
                    const s = issue.student || {};
                    const fullName =
                      s.fullName ||
                      `${s.lastName || ""}, ${s.firstName || ""}${
                        s.middleName ? " " + s.middleName : ""
                      }`.trim() ||
                      "—";

                    return (
                      <tr key={issue._id}>
                        <td>{s.studentNumber || "—"}</td>
                        <td>{fullName}</td>
                        <td>{issue.type || "—"}</td>
                        <td>{s.program || issue.program || "—"}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => openDetails(issue)}
                            >
                              <FaEye className="me-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => openConfirm(issue)}
                            >
                              <FaMoneyCheckAlt className="me-1" />
                              Confirm
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No issued & unpaid credentials found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* pagination footer */}
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
              disabled={page <= 1 || isLoadingList}
            >
              « First
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoadingList}
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
              onClick={() =>
                setPage((p) => Math.min(pageCount, p + 1))
              }
              disabled={page >= pageCount || isLoadingList}
            >
              Next ›
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount || isLoadingList}
            >
              Last »
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Details modal */}
      <IssueDetailsModal
        show={showDetails}
        issue={detailsIssue}
        onHide={closeDetails}
      />

      {/* Confirm modal */}
      <ConfirmPaymentModal
        show={showConfirm}
        onCancel={closeConfirm}
        onConfirm={handleConfirmPayment}
        issue={confirmIssue}
        isSaving={isSavingPayment}
        error={saveError}
      />
    </section>
  );
}

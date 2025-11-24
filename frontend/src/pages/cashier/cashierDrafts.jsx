// src/pages/CashierDrafts.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Card,
  Table,
  Spinner,
  Form,
  InputGroup,
  Badge,
  Modal,
  Alert,
} from "react-bootstrap";
import { FaSearch, FaSync, FaEye, FaMoneyCheckAlt, FaCog, FaCheckCircle } from "react-icons/fa";

import { getIssues } from "../../features/issuance/issueSlice";
import { confirmPayment, resetPaymentError } from "../../features/payments/paymentSlice";

const PAGE_SIZES = [10, 20, 50, 100];

const fmtDate = (v) => (v ? (v === "N/A" ? "N/A" : new Date(v).toLocaleDateString()) : "—");
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

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
    `${s.lastName || ""}, ${s.firstName || ""}${s.middleName ? " " + s.middleName : ""}`.trim() ||
    "—";
  const anchorNow = issue.anchorNow === true;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Issuance Details</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <h5 className="mb-2">Student</h5>
        <div className="mb-2"><strong>Name:</strong> <span className="text-muted">{fullName}</span></div>
        <div className="mb-2"><strong>Student No.:</strong> <span className="text-muted">{s.studentNumber || "—"}</span></div>
        <div className="mb-2"><strong>Program:</strong> <span className="text-muted">{s.program || issue.program || "—"}</span></div>
        <div className="mb-3"><strong>Date Graduated:</strong> <span className="text-muted">{fmtDate(s.dateGraduated || issue.dateGraduated)}</span></div>
        <hr />
        <h5 className="mb-2">Issuance</h5>
        <div className="mb-2"><strong>Created:</strong> <span className="text-muted">{fmtDateTime(issue.createdAt)}</span></div>
        <div className="mb-2"><strong>Type:</strong> <span className="text-muted">{issue.type || "—"}</span></div>
        <div className="mb-2"><strong>Purpose:</strong> <span className="text-muted">{issue.purpose || "—"}</span></div>
        <div className="mb-2 d-flex align-items-center gap-2">
          <strong className="mb-0">Status:</strong>
          <Badge bg={statusBadgeVariant(issue.status)}>{issue.status || "issued"}</Badge>
        </div>
        <div className="mb-2"><strong>Expiration:</strong> <span className="text-muted">{fmtDate(issue.expiration)}</span></div>
        <div className="mb-2"><strong>Amount:</strong> <span className="text-muted">{issue.amount != null ? issue.amount : "—"} {issue.currency || "PHP"}</span></div>
        <div className="mb-2"><strong>Order No.:</strong> <span className="text-muted">{issue.order_no || "—"}</span></div>
        <div className="mb-2"><strong>Receipt No.:</strong> <span className="text-muted">{issue.receipt_no || "—"}</span></div>
        <div className="mb-0"><strong>Anchor Today:</strong> <span className="text-muted">{anchorNow ? "Yes (queue for anchoring when paid)" : "No"}</span></div>

        {t && Object.keys(t).length > 0 && (
          <>
            <hr />
            <h5 className="mb-2">Template</h5>
            <div className="mb-2"><strong>Name:</strong> <span className="text-muted">{t.name || t.slug || "—"}</span></div>
            <div className="mb-2"><strong>Version:</strong> <span className="text-muted">{t.version || "—"}</span></div>
            <div className="mb-0"><strong>Base Price:</strong> <span className="text-muted">{t.price != null ? t.price : "—"} PHP</span></div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ----------------------- Confirm payment modal ----------------------- */
function ConfirmPaymentModal({ show, onCancel, onConfirm, issue, isSaving, error }) {
  const s = issue?.student || {};
  const fullName =
    s.fullName ||
    `${s.lastName || ""}, ${s.firstName || ""}${s.middleName ? " " + s.middleName : ""}`.trim() ||
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
    if (!Number.isFinite(num) || num <= 0) return;
    onConfirm(num, anchorNow);
  };

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title>Confirm Payment</Modal.Title></Modal.Header>
        <Modal.Body>
          <p className="mb-2">You are about to confirm payment for:</p>
          <ul className="mb-3">
            <li><strong>Student:</strong> {fullName} {s.studentNumber ? `(#${s.studentNumber})` : ""}</li>
            <li><strong>Type:</strong> {issue.type || "—"}</li>
            <li><strong>Program:</strong> {s.program || issue.program || "—"}</li>
            {/* status on this page is always unpaid */}
            <li><strong>Current status:</strong> unpaid</li>
          </ul>

          <Form.Group className="mb-3">
            <Form.Label>Payment Amount (PHP)</Form.Label>
            <Form.Control type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Form.Text className="text-muted">Default is <strong>250</strong>. You can adjust if needed.</Form.Text>
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
            After confirming, this issuance will be <strong>paid and signed</strong>, and ready for claiming.
          </Alert>

          {error ? <div className="text-danger mt-2">{String(error)}</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" type="button" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="success" disabled={isSaving}>
            {isSaving ? (<><Spinner size="sm" animation="border" className="me-2" />Saving…</>) : ("Confirm")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/* ----------------------- Payment success modal ----------------------- */
function PaymentSuccessModal({ show, onClose, issue }) {
  const s = issue?.student || {};
  const fullName =
    s.fullName ||
    `${s.lastName || ""}, ${s.firstName || ""}${s.middleName ? " " + s.middleName : ""}`.trim() ||
    "—";

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Body className="text-center py-4">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{ width: 64, height: 64, backgroundColor: "#e8f9f0" }}
        >
          <FaCheckCircle size={32} />
        </div>

        <h5 className="mb-2">Payment confirmed</h5>

        <p className="text-muted small mb-1">
          Payment has been recorded and this credential is now marked as{" "}
          <strong>paid &amp; signed</strong>.
        </p>

        <p className="text-muted small mb-0">
          {fullName !== "—" && (
            <>
              For <strong>{fullName}</strong>
              {s.studentNumber ? <> (#{s.studentNumber})</> : null}
              {issue?.type ? <> · <strong>{issue.type}</strong></> : null}
            </>
          )}
        </p>


      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="success" onClick={onClose}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------- Page Component --------------------------- */
export default function CashierDrafts() {
  const dispatch = useDispatch();

  const { issues, isLoadingList, isError, message } = useSelector((s) => s.issue || {});
  const { isSavingPayment, saveError } = useSelector((s) => s.payments || {});

  // filters (live)
  const [q, setQ] = useState("");
  const [range, setRange] = useState("1m");     // server-side
  const [program, setProgram] = useState("All"); // client-side
  const [type, setType] = useState("All");       // client-side

  // modal state + pending filters
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [rangePending, setRangePending] = useState("1m");
  const [programPending, setProgramPending] = useState("All");
  const [typePending, setTypePending] = useState("All");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsIssue, setDetailsIssue] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(null);

  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paidIssue, setPaidIssue] = useState(null);

  // initial load
  useEffect(() => {
    dispatch(getIssues({ range: "1m", unpaidOnly: true, status: "issued" }));
  }, [dispatch]);

  // options derived from loaded issues
  const programOptions = useMemo(() => {
    const set = new Set();
    (issues || []).forEach((d) => {
      const p = d?.student?.program || d?.program;
      if (p) set.add(p);
    });
    return ["All", ...Array.from(set).sort()];
  }, [issues]);

  // client-side filtering
  const rows = useMemo(() => {
    let r = Array.isArray(issues) ? issues : [];

    if (program && program !== "All") {
      r = r.filter(
        (d) =>
          (d?.student?.program || d?.program || "").toUpperCase() ===
          String(program).toUpperCase()
      );
    }

    if (type && type !== "All") {
      r = r.filter((d) => String(d.type || "").toLowerCase() === type.toLowerCase());
    }

    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter((issue) => {
        const s = issue.student || {};
        const fullName =
          s.fullName ||
          `${s.lastName || ""}, ${s.firstName || ""}${s.middleName ? " " + s.middleName : ""}`.trim();

        return (
          (s.studentNumber || "").toLowerCase().includes(needle) ||
          (fullName || "").toLowerCase().includes(needle) ||
          (issue.type || "").toLowerCase().includes(needle) ||
          (issue.purpose || "").toLowerCase().includes(needle) ||
          (s.program || issue.program || "").toLowerCase().includes(needle)
        );
      });
    }

    return r;
  }, [issues, program, type, q]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, limit)));

  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page, limit]);

  useEffect(() => {
    const pc = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, limit)));
    if (page > pc) setPage(pc);
  }, [total, limit, page]);

  const applyToolbar = useCallback(() => {
    // server fetch only cares about range; unpaidOnly + status fixed
    dispatch(getIssues({ range, unpaidOnly: true, status: "issued" }));
    setPage(1);
  }, [dispatch, range]);

  const resetAll = useCallback(() => {
    setQ("");
    setRange("1m");
    setProgram("All");
    setType("All");
    setRangePending("1m");
    setProgramPending("All");
    setTypePending("All");
    dispatch(getIssues({ range: "1m", unpaidOnly: true, status: "issued" }));
    setPage(1);
  }, [dispatch]);

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
    const issueJustPaid = confirmIssue;
    try {
      await dispatch(confirmPayment({ issueId: confirmIssue._id, amount, anchorNow })).unwrap();
      closeConfirm();
      dispatch(getIssues({ range, unpaidOnly: true, status: "issued" }));
      setPaidIssue(issueJustPaid);
      setShowPaymentSuccess(true);
    } catch {
      /* saveError shows in the confirm modal */
    }
  };

  const openFilterSettings = () => {
    setRangePending(range);
    setProgramPending(program);
    setTypePending(type);
    setShowFilterSettings(true);
  };
  const applyModalFilters = () => {
    setRange(rangePending);
    setProgram(programPending);
    setType(typePending);
    setShowFilterSettings(false);
    dispatch(getIssues({ range: rangePending, unpaidOnly: true, status: "issued" }));
    setPage(1);
  };

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h5 mb-0">Cashier · Drafts (Issued & Unpaid)</h1>
        <Button
          variant="outline-primary"
          onClick={() => dispatch(getIssues({ range, unpaidOnly: true, status: "issued" }))}
          disabled={isLoadingList}
        >
          <FaSync className="me-2" />
          Reload
        </Button>
      </div>

      {/* global errors */}
      {isError && message && (
        <Alert variant="danger" className="mb-3">
          {String(message)}
        </Alert>
      )}

      {/* toolbar (search + gear) */}
      <Card className="mb-3">
        <Card.Body className="pb-2">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              applyToolbar();
            }}
          >
            <InputGroup className="flex-nowrap">
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by name, student no., program, type, purpose…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={isLoadingList}>
                Apply
              </Button>
              <Button type="button" variant="outline-secondary" onClick={resetAll} disabled={isLoadingList}>
                Reset
              </Button>
              <Button
                type="button"
                variant="outline-dark"
                title="Filter settings"
                onClick={openFilterSettings}
              >
                <FaCog />
              </Button>
            </InputGroup>
          </Form>

          {/* badges row */}
          <div className="mt-2 d-flex flex-wrap gap-2">
            {q ? <Badge bg="light" text="dark">q: {q}</Badge> : <Badge bg="light" text="dark">q: (none)</Badge>}
            <Badge bg="light" text="dark">Program: {program || "All"}</Badge>
            <Badge bg="light" text="dark">Type: {type || "All"}</Badge>
            <Badge bg="light" text="dark">Range: {range || "All"}</Badge>
            <Badge bg="secondary">Issued & unpaid: {Array.isArray(issues) ? issues.length : 0}</Badge>
          </div>

          <div className="mt-2 small text-muted">
            Server filter → <strong>range: {range}</strong>, <strong>status: issued</strong>, <strong>unpaid only</strong>
          </div>
        </Card.Body>
      </Card>

      {/* table */}
      <Card>
        <Card.Header className="bg-light">
          <strong>Drafts (Issued & Unpaid)</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th style={{ width: 200 }}>Actions</th>
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
                      `${s.lastName || ""}, ${s.firstName || ""}${s.middleName ? " " + s.middleName : ""}`.trim() ||
                      "—";

                    return (
                      <tr key={issue._id}>
                        <td>
                          <div className="fw-semibold">{fullName}</div>
                          <div className="small text-muted">{s.studentNumber ? `#${s.studentNumber}` : "—"}</div>
                        </td>
                        <td>{s.program || issue.program || "—"}</td>
                        <td>{issue.type || "—"}</td>
                        <td>{issue.purpose || "—"}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => openDetails(issue)}
                              title="View issuance details"
                            >
                              <FaEye />
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => openConfirm(issue)}
                              title="Confirm payment & sign VC"
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
                      No issued & unpaid credentials found for these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* pagination */}
        <Card.Footer className="d-flex align-items-center justify-content-between">
          <div className="text-muted small">
            Page {page} of {pageCount}
            {total ? ` • Total ${total}` : ""}
          </div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setPage(1)} disabled={page <= 1 || isLoadingList}>« First</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoadingList}>‹ Prev</Button>
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
            <Button size="sm" variant="outline-secondary" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount || isLoadingList}>Next ›</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setPage(pageCount)} disabled={page >= pageCount || isLoadingList}>Last »</Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Details modal */}
      <IssueDetailsModal show={showDetails} issue={detailsIssue} onHide={closeDetails} />

      {/* Confirm modal */}
      <ConfirmPaymentModal
        show={showConfirm}
        onCancel={closeConfirm}
        onConfirm={handleConfirmPayment}
        issue={confirmIssue}
        isSaving={isSavingPayment}
        error={saveError}
      />

      {/* Payment success modal */}
      <PaymentSuccessModal
        show={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        issue={paidIssue}
      />

      {/* Filter settings modal */}
      <Modal show={showFilterSettings} onHide={() => setShowFilterSettings(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Draft Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <div>
              <Form.Label>Date Range</Form.Label>
              <Form.Select value={rangePending} onChange={(e) => setRangePending(e.target.value)}>
                <option value="All">All dates</option>
                <option value="today">Today</option>
                <option value="1w">1 week</option>
                <option value="1m">1 month</option>
                <option value="6m">6 months</option>
              </Form.Select>
              <Form.Text className="text-muted">This filter updates the server query.</Form.Text>
            </div>

            <div>
              <Form.Label>Program</Form.Label>
              <Form.Select value={programPending} onChange={(e) => setProgramPending(e.target.value)}>
                {programOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Client-side filter.</Form.Text>
            </div>

            <div>
              <Form.Label>Type</Form.Label>
              <Form.Select value={typePending} onChange={(e) => setTypePending(e.target.value)}>
                <option value="All">All types</option>
                <option value="diploma">Diploma</option>
                <option value="tor">TOR</option>
              </Form.Select>
              <Form.Text className="text-muted">Client-side filter.</Form.Text>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" type="button" onClick={() => setShowFilterSettings(false)}>Close</Button>
          <Button variant="primary" type="button" onClick={applyModalFilters}>Apply</Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

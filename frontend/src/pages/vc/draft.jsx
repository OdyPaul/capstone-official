// src/pages/Drafts.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getIssues, deleteIssue } from "../../features/issuance/issueSlice";
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
import { FaSearch, FaSync, FaCog, FaTrash, FaPlus, FaEye } from "react-icons/fa";

/* ----------------------------- constants ----------------------------- */
// We use this page as: "Issued credentials (unpaid)"
const DEFAULTS = {
  range: "1m",
  program: "All",
  type: "All",
  status: "issued", // focus on issued
  q: "",
  orderNo: "",
  receiptNo: "",
  unpaidOnly: true, // only without receipt_no
};

const VALID_STATUSES = ["issued", "signed", "anchored", "void", "All"];

// page size options + default (10 rows)
const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_LIMIT = 10;

/* ------------------------------ helpers ------------------------------ */
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

/* --------------------------- details modal --------------------------- */
function IssueDetailsModal({ show, onHide, issue, onDelete }) {
  if (!issue) return null;

  const s = issue.student || {};
  const t = issue.template || {};

  const fullName =
    s.fullName ||
    `${s.lastName || ""}, ${s.firstName || ""}${
      s.middleName ? " " + s.middleName : ""
    }`.trim() ||
    "—";

  const canDelete = (issue.status || "") === "issued" && !issue.receipt_no;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Issuance Details</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <h5 className="mb-3">Student</h5>
        <dl className="row mb-4">
          <dt className="col-sm-3">Name</dt>
          <dd className="col-sm-9">{fullName}</dd>

          <dt className="col-sm-3">Student No.</dt>
          <dd className="col-sm-9">{s.studentNumber || "—"}</dd>

          <dt className="col-sm-3">Program</dt>
          <dd className="col-sm-9">{s.program || issue.program || "—"}</dd>

          <dt className="col-sm-3">Date Graduated</dt>
          <dd className="col-sm-9">
            {fmtDate(s.dateGraduated || issue.dateGraduated)}
          </dd>
        </dl>

        <h5 className="mb-3">Issuance</h5>
        <dl className="row mb-4">
          <dt className="col-sm-3">Created</dt>
          <dd className="col-sm-9">{fmtDateTime(issue.createdAt)}</dd>

          <dt className="col-sm-3">Type</dt>
          <dd className="col-sm-9">{issue.type || "—"}</dd>

          <dt className="col-sm-3">Purpose</dt>
          <dd className="col-sm-9">{issue.purpose || "—"}</dd>

          <dt className="col-sm-3">Status</dt>
          <dd className="col-sm-9">
            <Badge bg={statusBadgeVariant(issue.status)}>
              {issue.status || "issued"}
            </Badge>
          </dd>

          <dt className="col-sm-3">Expiration</dt>
          <dd className="col-sm-9">{fmtDate(issue.expiration)}</dd>

          <dt className="col-sm-3">Amount</dt>
          <dd className="col-sm-9">
            {issue.amount != null ? issue.amount : "—"}{" "}
            {issue.currency || "PHP"}
          </dd>

          <dt className="col-sm-3">Order No.</dt>
          <dd className="col-sm-9">{issue.order_no || "—"}</dd>

          <dt className="col-sm-3">Receipt No.</dt>
          <dd className="col-sm-9">{issue.receipt_no || "—"}</dd>
        </dl>

        <h5 className="mb-3">Template</h5>
        <dl className="row mb-0">
          <dt className="col-sm-3">Name</dt>
          <dd className="col-sm-9">{t.name || t.slug || "—"}</dd>

          <dt className="col-sm-3">Version</dt>
          <dd className="col-sm-9">{t.version || "—"}</dd>

          <dt className="col-sm-3">Base Price</dt>
          <dd className="col-sm-9">
            {t.price != null ? t.price : "—"} PHP
          </dd>
        </dl>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        {canDelete && typeof onDelete === "function" && (
          <Button
            variant="outline-danger"
            onClick={() => onDelete(issue)}
          >
            <FaTrash className="me-2" />
            Delete Issuance
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------------- page --------------------------------- */
export default function Drafts() {
  const dispatch = useDispatch();
  const {
    issues,
    issueFilters,
    isLoadingList,
    isError,
    message,
  } = useSelector((s) => s.issue || {});

  // local filter state (mirrors Redux/localStorage)
  const [q, setQ] = useState(issueFilters?.q ?? DEFAULTS.q);
  const [range, setRange] = useState(issueFilters?.range ?? DEFAULTS.range);
  const [program, setProgram] = useState(
    issueFilters?.program ?? DEFAULTS.program
  );
  const [type, setType] = useState(issueFilters?.type ?? DEFAULTS.type);
  const [status, setStatus] = useState(
    VALID_STATUSES.includes(issueFilters?.status)
      ? issueFilters.status
      : DEFAULTS.status
  );
  const [orderNo, setOrderNo] = useState(
    issueFilters?.orderNo ?? DEFAULTS.orderNo
  );
  const [receiptNo, setReceiptNo] = useState(
    issueFilters?.receiptNo ?? DEFAULTS.receiptNo
  );
  const [unpaidOnly, setUnpaidOnly] = useState(
    typeof issueFilters?.unpaidOnly === "boolean"
      ? issueFilters.unpaidOnly
      : DEFAULTS.unpaidOnly
  );

  // pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // ui
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsIssue, setDetailsIssue] = useState(null);

  // initial load: restore saved filters -> defaults to issued+unpaid
  useEffect(() => {
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem("lastIssueFilters")) || {};
      } catch {
        return {};
      }
    })();

    const initial = {
      range: saved.range ?? DEFAULTS.range,
      program: saved.program ?? DEFAULTS.program,
      type: saved.type ?? DEFAULTS.type,
      status: VALID_STATUSES.includes(saved.status)
        ? saved.status
        : DEFAULTS.status,
      q: saved.q ?? DEFAULTS.q,
      orderNo: saved.orderNo ?? DEFAULTS.orderNo,
      receiptNo: saved.receiptNo ?? DEFAULTS.receiptNo,
      unpaidOnly:
        typeof saved.unpaidOnly === "boolean"
          ? saved.unpaidOnly
          : DEFAULTS.unpaidOnly,
    };

    setRange(initial.range);
    setProgram(initial.program);
    setType(initial.type);
    setStatus(initial.status);
    setQ(initial.q);
    setOrderNo(initial.orderNo);
    setReceiptNo(initial.receiptNo);
    setUnpaidOnly(initial.unpaidOnly);

    dispatch(getIssues(initial));
  }, [dispatch]);

  // derived options
  const rows = issues || [];

  const programOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((d) => {
      const p = d?.student?.program || d?.program;
      if (p) set.add(p);
    });
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  // totals + pagination derived values
  const total = rows.length || 0;
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(0, total) / Math.max(1, limit))
  );
  const startIndex = (page - 1) * limit;
  const pageRows = rows.slice(startIndex, startIndex + limit);

  // keep current page within bounds when data/limit changes
  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  // actions
  const persistAndFetch = useCallback(
    (filters) => {
      try {
        localStorage.setItem("lastIssueFilters", JSON.stringify(filters));
      } catch {}
      dispatch(getIssues(filters));
    },
    [dispatch]
  );

  const applyFilters = useCallback(() => {
    persistAndFetch({
      q,
      range,
      program,
      type,
      status,
      orderNo,
      receiptNo,
      unpaidOnly,
    });
  }, [
    persistAndFetch,
    q,
    range,
    program,
    type,
    status,
    orderNo,
    receiptNo,
    unpaidOnly,
  ]);

  const resetFilters = useCallback(() => {
    setQ(DEFAULTS.q);
    setRange(DEFAULTS.range);
    setProgram(DEFAULTS.program);
    setType(DEFAULTS.type);
    setStatus(DEFAULTS.status);
    setOrderNo(DEFAULTS.orderNo);
    setReceiptNo(DEFAULTS.receiptNo);
    setUnpaidOnly(DEFAULTS.unpaidOnly);
    persistAndFetch(DEFAULTS);
  }, [persistAndFetch]);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this issuance? (Allowed only while status is ISSUED and not yet paid)"
      )
    )
      return;
    try {
      await dispatch(deleteIssue(id)).unwrap();
      // If we just deleted the one shown in the details modal, close it
      if (detailsIssue && detailsIssue._id === id) {
        setShowDetails(false);
        setDetailsIssue(null);
      }
      // refresh current list with same filters
      applyFilters();
    } catch (e) {
      alert(
        typeof e === "string" ? e : e?.message || "Failed to delete issuance"
      );
    }
  };

  const openDetails = (issue) => {
    setDetailsIssue(issue);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setDetailsIssue(null);
  };

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Draft Issuances</h1>
        <div className="d-flex gap-2">
          <Button as={NavLink} to="/vc/issue" variant="success">
            <FaPlus className="me-2" />
            Issue New Credentials
          </Button>
          <Button variant="outline-primary" onClick={applyFilters}>
            <FaSync className="me-2" />
            Reload
          </Button>
        </div>
      </div>

      {/* global error from listing */}
      {isError && message && (
        <Alert variant="danger" className="mb-3">
          {String(message)}
        </Alert>
      )}

      {/* toolbar */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                applyFilters();
              }}
              className="flex-grow-1"
            >
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by name, student no., purpose…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button type="submit" variant="primary">
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline-dark"
                  title="Filter settings"
                  onClick={() => setShowSettings(true)}
                >
                  <FaCog />
                </Button>
              </InputGroup>
            </Form>

            {/* badges */}
            <div className="ms-auto d-flex gap-2 flex-wrap mt-2 mt-md-0">
              <Badge bg="light" text="dark">
                Range: {range}
              </Badge>
              <Badge bg="light" text="dark">
                Program: {program}
              </Badge>
              <Badge bg="light" text="dark">
                Type: {type}
              </Badge>
              <Badge bg="light" text="dark">
                Status: {status}
              </Badge>
              {orderNo ? (
                <Badge bg="light" text="dark">
                  Order#: {orderNo}
                </Badge>
              ) : null}
              {receiptNo ? (
                <Badge bg="light" text="dark">
                  Receipt#: {receiptNo}
                </Badge>
              ) : null}
              {unpaidOnly ? (
                <Badge bg="warning" text="dark">
                  Unpaid only
                </Badge>
              ) : null}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th style={{ width: 80 }} className="text-end">
                    Issued
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading issues…
                    </td>
                  </tr>
                ) : rows.length ? (
                  pageRows.map((d) => {
                    const s = d?.student || {};
                    const fullName =
                      s.fullName ||
                      `${s.lastName || ""}, ${s.firstName || ""}${
                        s.middleName ? " " + s.middleName : ""
                      }`.trim() ||
                      "—";

                    return (
                      <tr key={d._id}>
                        <td>
                          <div className="fw-semibold">{fullName}</div>
                          <div className="small text-muted">
                            {s.studentNumber ? `#${s.studentNumber}` : "—"}
                          </div>
                        </td>
                        <td>{s.program || d.program || "—"}</td>
                        <td>{d.type || "—"}</td>
                        <td>{d.purpose || "—"}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            title="View issuance details"
                            onClick={() => openDetails(d)}
                          >
                            <FaEye />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No issues found. Try adjusting filters (Status defaults
                      to <strong>issued</strong> and “Unpaid only” is enabled).
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
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
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

      {/* filter settings */}
      <Modal
        show={showSettings}
        onHide={() => setShowSettings(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Issue Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <div>
              <Form.Label>Range</Form.Label>
              <Form.Select
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="All">All</option>
                <option value="today">Today</option>
                <option value="1w">1 week</option>
                <option value="1m">1 month</option>
                <option value="6m">6 months</option>
              </Form.Select>
            </div>

            <div>
              <Form.Label>Program</Form.Label>
              <Form.Select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                {programOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Derived from loaded issues.
              </Form.Text>
            </div>

            <div>
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="All">All</option>
                <option value="diploma">Diploma</option>
                <option value="tor">TOR</option>
              </Form.Select>
            </div>

            <div>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="issued">Issued</option>
                <option value="signed">Signed</option>
                <option value="anchored">Anchored</option>
                <option value="void">Void</option>
                <option value="All">All</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Defaults to <strong>Issued</strong>.
              </Form.Text>
            </div>

            <div>
              <Form.Label>Order No.</Form.Label>
              <Form.Control
                placeholder="Exact order number (optional)"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value.trim())}
              />
            </div>

            <div>
              <Form.Label>Receipt No.</Form.Label>
              <Form.Control
                placeholder="Exact receipt number (optional)"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value.trim())}
              />
              <Form.Text className="text-muted">
                Leave empty to ignore this filter.
              </Form.Text>
            </div>

            <div>
              <Form.Check
                type="switch"
                id="unpaid-only-switch"
                label="Unpaid only (no receipt yet)"
                checked={unpaidOnly}
                onChange={(e) => setUnpaidOnly(e.target.checked)}
              />
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowSettings(false)}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowSettings(false);
              applyFilters();
            }}
          >
            Apply
          </Button>
        </Modal.Footer>
      </Modal>

      {/* details modal */}
      <IssueDetailsModal
        show={showDetails}
        issue={detailsIssue}
        onHide={closeDetails}
        onDelete={(issue) => handleDelete(issue._id)}
      />
    </section>
  );
}

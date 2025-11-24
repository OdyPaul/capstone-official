// src/pages/cashier/Issued.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Table,
  Button,
  Spinner,
  Form,
  InputGroup,
  Badge,
  Modal,
  Alert,
} from "react-bootstrap";
import { FaSync, FaEye } from "react-icons/fa";
import { getIssues } from "../../features/issuance/issueSlice";

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

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Issued Credential</Modal.Title>
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
              {issue.status || "signed"}
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
      </Modal.Footer>
    </Modal>
  );
}

export default function CashierIssued() {
  const dispatch = useDispatch();
  const { issues, isLoadingList, isError, message } = useSelector(
    (s) => s.issue || {}
  );

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsIssue, setDetailsIssue] = useState(null);

  useEffect(() => {
    dispatch(
      getIssues({
        status: "signed",
        unpaidOnly: false,
        range: "1m",
      })
    );
  }, [dispatch]);

  const baseRows = useMemo(
    () => (issues || []).filter((i) => (i.status || "") === "signed"),
    [issues]
  );

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
      const program = s.program || issue.program || "";
      return (
        (s.studentNumber || "").toLowerCase().includes(needle) ||
        (fullName || "").toLowerCase().includes(needle) ||
        (issue.type || "").toLowerCase().includes(needle) ||
        (issue.purpose || "").toLowerCase().includes(needle) ||
        program.toLowerCase().includes(needle)
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

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h5 mb-0">Issued Credentials (Paid)</h1>
        <Button
          variant="outline-primary"
          onClick={() =>
            dispatch(
              getIssues({
                status: "signed",
                unpaidOnly: false,
                range: "1m",
              })
            )
          }
          disabled={isLoadingList}
        >
          <FaSync className="me-2" />
          Reload
        </Button>
      </div>

      {isError && message && (
        <Alert variant="danger" className="mb-3">
          {String(message)}
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text>Search</InputGroup.Text>
            <Form.Control
              placeholder="student no, name, type, program, purpose…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Badge bg="secondary" className="ms-2 align-self-center">
              Total: {baseRows.length}
            </Badge>
          </InputGroup>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Created</th>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Expiration</th>
                  <th style={{ width: 80 }} className="text-end">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : pageRows.length ? (
                  pageRows.map((d) => {
                    const s = d.student || {};
                    const fullName =
                      s.fullName ||
                      `${s.lastName || ""}, ${s.firstName || ""}${
                        s.middleName ? " " + s.middleName : ""
                      }`.trim() ||
                      "—";

                    return (
                      <tr key={d._id}>
                        <td>{fmtDateTime(d.createdAt)}</td>
                        <td>
                          <div className="fw-semibold">{fullName}</div>
                          <div className="small text-muted">
                            {s.studentNumber ? `#${s.studentNumber}` : "—"}
                          </div>
                        </td>
                        <td>{s.program || d.program || "—"}</td>
                        <td>{d.type || "—"}</td>
                        <td>{d.purpose || "—"}</td>
                        <td>
                          <Badge bg={statusBadgeVariant(d.status)}>
                            {d.status || "signed"}
                          </Badge>
                        </td>
                        <td>{fmtDate(d.expiration)}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-secondary"
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
                    <td colSpan={8} className="text-center py-4">
                      No signed credentials found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>

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

      <IssueDetailsModal
        show={showDetails}
        issue={detailsIssue}
        onHide={closeDetails}
      />
    </section>
  );
}

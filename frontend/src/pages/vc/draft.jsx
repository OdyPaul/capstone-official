// src/pages/Drafts.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getDrafts, deleteDraft } from "../../features/draft_vc/vcSlice";
import {
  Button,
  Card,
  Table,
  Spinner,
  Form,
  InputGroup,
  Badge,
  Modal,
} from "react-bootstrap";
import { FaSearch, FaSync, FaCog, FaTrash, FaPlus, FaEye } from "react-icons/fa";

/* ----------------------------- constants ----------------------------- */
const DEFAULTS = {
  range: "1m",
  program: "All",
  type: "All",
  status: "draft",
  q: "",
  tx: "",
};
const VALID_STATUSES = ["draft", "signed", "anchored", "All"];

/* ------------------------------ helpers ------------------------------ */
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");
const fmtDate = (v) =>
  v ? (v === "N/A" ? "N/A" : new Date(v).toLocaleDateString()) : "—";

const getTxFromDraft = (d = {}) =>
  d?.payment_tx_no || d?.tx_no || d?.tx || d?.client_tx || null;

const statusBadgeVariant = (st) =>
  st === "anchored" ? "success" : st === "signed" ? "primary" : "secondary";

/* --------------------------- small components --------------------------- */
function TxViewerModal({ show, onHide, txNo }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(txNo || "");
    } catch {}
  };
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Transaction ID</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <code className="d-inline-block p-2 bg-light rounded">{txNo || "—"}</code>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={copy}>
          Copy
        </Button>
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------------- page --------------------------------- */
export default function Drafts() {
  const dispatch = useDispatch();
  const { drafts, isLoadingList, draftFilters } = useSelector((s) => s.vc);

  // local filter state (mirrors Redux/localStorage)
  const [q, setQ] = useState(draftFilters?.q ?? DEFAULTS.q);
  const [range, setRange] = useState(draftFilters?.range ?? DEFAULTS.range);
  const [program, setProgram] = useState(draftFilters?.program ?? DEFAULTS.program);
  const [type, setType] = useState(draftFilters?.type ?? DEFAULTS.type);
  const [status, setStatus] = useState(
    VALID_STATUSES.includes(draftFilters?.status) ? draftFilters.status : DEFAULTS.status
  );
  const [tx, setTx] = useState(draftFilters?.tx ?? DEFAULTS.tx);

  // ui
  const [showSettings, setShowSettings] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [txNoToShow, setTxNoToShow] = useState("");

  // initial load: restore saved filters -> default to status="draft"
  useEffect(() => {
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem("lastDraftFilters")) || {};
      } catch {
        return {};
      }
    })();

    const initial = {
      range: saved.range ?? DEFAULTS.range,
      program: saved.program ?? DEFAULTS.program,
      type: saved.type ?? DEFAULTS.type,
      status: VALID_STATUSES.includes(saved.status) ? saved.status : DEFAULTS.status,
      q: saved.q ?? DEFAULTS.q,
      tx: saved.tx ?? DEFAULTS.tx,
    };

    setRange(initial.range);
    setProgram(initial.program);
    setType(initial.type);
    setStatus(initial.status);
    setQ(initial.q);
    setTx(initial.tx);

    dispatch(getDrafts(initial));
  }, [dispatch]);

  // derived options
  const programOptions = useMemo(() => {
    const set = new Set();
    (drafts || []).forEach((d) => {
      const p = d?.student?.program || d?.program;
      if (p) set.add(p);
    });
    return ["All", ...Array.from(set).sort()];
  }, [drafts]);

  const rows = drafts || [];

  // actions
  const persistAndFetch = useCallback(
    (filters) => {
      localStorage.setItem("lastDraftFilters", JSON.stringify(filters));
      dispatch(getDrafts(filters));
    },
    [dispatch]
  );

  const applyFilters = useCallback(() => {
    persistAndFetch({ q, range, program, type, status, tx });
  }, [persistAndFetch, q, range, program, type, status, tx]);

  const resetFilters = useCallback(() => {
    setQ(DEFAULTS.q);
    setRange(DEFAULTS.range);
    setProgram(DEFAULTS.program);
    setType(DEFAULTS.type);
    setStatus(DEFAULTS.status);
    setTx(DEFAULTS.tx);
    persistAndFetch(DEFAULTS);
  }, [persistAndFetch]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this draft? (Allowed only when no paid/consumed payment)"))
      return;
    try {
      await dispatch(deleteDraft(id)).unwrap();
    } catch (e) {
      alert(typeof e === "string" ? e : e?.message || "Failed to delete draft");
    }
  };

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Draft Registry</h1>
        <div className="d-flex gap-2">
          <Button as={NavLink} to="/vc/sub/createDrafts" variant="success">
            <FaPlus className="me-2" />
            Create Drafts
          </Button>
          <Button variant="outline-primary" onClick={applyFilters}>
            <FaSync className="me-2" />
            Reload
          </Button>
        </div>
      </div>

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
                <Button type="button" variant="outline-secondary" onClick={resetFilters}>
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
            <div className="ms-auto d-flex gap-2 flex-wrap">
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
              {tx ? (
                <Badge bg="light" text="dark">
                  TX: {tx}
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
                  <th>Created</th>
                  <th>Student</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Expiration</th>
                  <th style={{ width: 90 }}>TX</th>
                  <th style={{ width: 70 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading drafts…
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((d) => {
                    const s = d?.student || {};
                    const txNo = getTxFromDraft(d);
                    return (
                      <tr key={d._id}>
                        <td>{fmtDateTime(d?.createdAt)}</td>
                        <td>
                          <div className="fw-semibold">{s.fullName || "—"}</div>
                          <div className="small text-muted">
                            {s.studentNumber ? `#${s.studentNumber}` : "—"}
                          </div>
                        </td>
                        <td>{s.program || d.program || "—"}</td>
                        <td>{d.type || "—"}</td>
                        <td>{d.purpose || "—"}</td>
                        <td>
                          <Badge bg={statusBadgeVariant(d.status)}>{d.status || "draft"}</Badge>
                        </td>
                        <td>{fmtDate(d?.expiration)}</td>
                        <td>
                          {txNo ? (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              title="View transaction ID"
                              onClick={() => {
                                setTxNoToShow(txNo);
                                setShowTx(true);
                              }}
                            >
                              <FaEye className="me-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(d._id)}
                            title="Delete draft"
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      No drafts found. Try adjusting filters (Status defaults to Draft; Range
                      defaults to last 1 month).
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* filter settings */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Draft Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <div>
              <Form.Label>Range</Form.Label>
              <Form.Select value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="All">All</option>
                <option value="today">Today</option>
                <option value="1w">1 week</option>
                <option value="1m">1 month</option>
                <option value="6m">6 months</option>
              </Form.Select>
            </div>

            <div>
              <Form.Label>Program</Form.Label>
              <Form.Select value={program} onChange={(e) => setProgram(e.target.value)}>
                {programOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Derived from loaded drafts.</Form.Text>
            </div>

            <div>
              <Form.Label>Type</Form.Label>
              <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="All">All</option>
                <option value="diploma">Diploma</option>
                <option value="tor">TOR</option>
              </Form.Select>
            </div>

            <div>
              <Form.Label>Status</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="signed">Signed</option>
                <option value="anchored">Anchored</option>
                <option value="All">All</option>
              </Form.Select>
              <Form.Text className="text-muted">Defaults to Draft.</Form.Text>
            </div>

            <div>
              <Form.Label>Transaction ID</Form.Label>
              <Form.Control
                placeholder="Exact client_tx or payment tx (optional)"
                value={tx}
                onChange={(e) => setTx(e.target.value.replace(/\s/g, ""))}
              />
              <Form.Text className="text-muted">Leave empty to show all.</Form.Text>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowSettings(false)}>
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

      {/* tx modal */}
      <TxViewerModal show={showTx} txNo={txNoToShow} onHide={() => setShowTx(false)} />
    </section>
  );
}

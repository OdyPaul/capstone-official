// src/pages/Draft.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getDrafts as getDraftsThunk,
  deleteDraft as deleteDraftThunk,
} from "../../features/draft_vc/vcSlice";
import {
  Button,
  Table,
  Form,
  Row,
  Col,
  InputGroup,
  Badge,
  Spinner,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  FaUserCheck,
  FaSync,
  FaTrash,
  FaSearch,
  FaFilter,
  FaBroom,
} from "react-icons/fa";

const RANGE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "1w" },
  { label: "Last 1 month", value: "1m" },
  { label: "Last 6 months", value: "6m" },
];

function loadInitialFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem("lastDraftFilters") || "{}");
    return {
      type: saved.type ?? "All",
      range: saved.range ?? "1m",
      program: saved.program ?? "All",
      q: saved.q ?? "",
      template: saved.template ?? "",
    };
  } catch {
    return { type: "All", range: "1m", program: "All", q: "", template: "" };
  }
}

const statusVariant = (s) =>
  ({ draft: "secondary", signed: "warning", anchored: "success" }[s] || "secondary");

const fmtDate = (d, withTime = true) =>
  d ? new Date(d)[withTime ? "toLocaleString" : "toLocaleDateString"]() : "—";

export default function Draft() {
  const dispatch = useDispatch();
  const { drafts, isLoadingList, isLoadingCreate, isLoadingDelete, message } =
    useSelector((s) => s.vc);

  const [filters, setFilters] = useState(loadInitialFilters());
  const isBusy = isLoadingList || isLoadingCreate || isLoadingDelete;

  useEffect(() => {
    dispatch(getDraftsThunk(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    dispatch(getDraftsThunk(filters));
  };

  const handleResetFilters = () => {
    const reset = { type: "All", range: "1m", program: "All", q: "", template: "" };
    setFilters(reset);
    dispatch(getDraftsThunk(reset));
  };

  const handleRefresh = () => {
    dispatch(getDraftsThunk(filters));
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm("Delete this draft? This cannot be undone.");
    if (!ok) return;
    await dispatch(deleteDraftThunk(id));
  };

  const highlight = (text, needle) => {
    if (!needle) return text;
    try {
      const parts = String(text || "").split(new RegExp(`(${needle})`, "ig"));
      return parts.map((p, i) =>
        p.toLowerCase() === needle.toLowerCase() ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>
      );
    } catch {
      return text;
    }
  };

  const total = drafts?.length || 0;
  const emptyState = !isBusy && total === 0;

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 mb-0">Drafts</h1>

        <div className="d-flex gap-2">
          <Button as={NavLink} to="/sub/createDrafts" variant="success">
            {/* New button */}
            Create Drafts
          </Button>

          <Button as={NavLink} to="/sub/template" variant="primary">
            <FaUserCheck className="me-2" />
            Add Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Form onSubmit={handleApplyFilters} className="mb-3">
        <Row className="g-2 align-items-end">
          <Col xs={12} md={3}>
            <Form.Label className="small text-muted mb-1">Range</Form.Label>
            <Form.Select
              value={filters.range}
              onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value }))}
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12} md={3}>
            <Form.Label className="small text-muted mb-1">Program</Form.Label>
            <Form.Control
              placeholder="All"
              value={filters.program}
              onChange={(e) => setFilters((f) => ({ ...f, program: e.target.value || "All" }))}
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Label className="small text-muted mb-1">Type</Form.Label>
            <Form.Control
              placeholder="All"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || "All" }))}
            />
          </Col>

          <Col xs={12} md={3}>
            <Form.Label className="small text-muted mb-1">Template ID</Form.Label>
            <Form.Control
              placeholder="(optional ObjectId)"
              value={filters.template}
              onChange={(e) => setFilters((f) => ({ ...f, template: e.target.value.trim() }))}
            />
          </Col>

          <Col xs={12} md={6}>
            <Form.Label className="small text-muted mb-1">Search</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Name, student no., type, purpose, template name"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyFilters();
                }}
              />
              <Button variant="secondary" onClick={handleApplyFilters}>
                <FaFilter className="me-2" />
                Apply
              </Button>
              <Button variant="outline-secondary" onClick={handleResetFilters}>
                <FaBroom className="me-2" />
                Reset
              </Button>
            </InputGroup>
          </Col>

          <Col xs={12} md="auto" className="ms-auto">
            <Button variant="outline-primary" onClick={handleRefresh}>
              <FaSync className="me-2" />
              Refresh
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Status bar */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="small text-muted">
          {isBusy ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />
              Loading…
            </>
          ) : (
            <>
              Showing <strong>{total}</strong> {total === 1 ? "draft" : "drafts"}
            </>
          )}
          {message ? <span className="ms-2 text-danger">• {String(message)}</span> : null}
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <Table bordered hover size="sm" className="align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: 220 }}>Student</th>
              <th style={{ minWidth: 200 }}>Template</th>
              <th>Type</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Expiration</th>
              <th style={{ minWidth: 180 }}>Created</th>
              <th style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isBusy && total === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <Spinner animation="border" className="me-2" />
                  Loading drafts…
                </td>
              </tr>
            ) : !isBusy && total === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-5 text-muted">
                  No drafts found. Try adjusting filters or create a new draft.
                </td>
              </tr>
            ) : (
              drafts.map((d) => {
                const student = d.student || {};
                const template = d.template || {};
                return (
                  <tr key={d._id}>
                    <td>
                      <div className="fw-semibold">{student.fullName || "—"}</div>
                      <div className="small text-muted">
                        {student.studentNumber ? `#${student.studentNumber}` : "—"} • {student.program || "—"}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">{template.name || "—"}</div>
                      <div className="small text-muted">
                        {template.slug ? `${template.slug}` : "—"}
                        {template.version != null ? ` • v${template.version}` : ""}
                      </div>
                    </td>
                    <td>{d.type || "—"}</td>
                    <td>{d.purpose || "—"}</td>
                    <td>
                      <Badge bg={statusVariant(d.status)}>{d.status || "draft"}</Badge>
                    </td>
                    <td>{fmtDate(d.expiration, false)}</td>
                    <td className="small">{fmtDate(d.createdAt, true)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <OverlayTrigger overlay={<Tooltip>Delete draft</Tooltip>}>
                          <span>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(d._id)}
                              disabled={isLoadingDelete}
                            >
                              <FaTrash />
                            </Button>
                          </span>
                        </OverlayTrigger>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      <p className="text-muted small mb-0">
        Filters map to backend query params: <code>?type=&range=&program=&q=&template=</code>.
      </p>
    </section>
  );
}

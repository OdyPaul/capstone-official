// src/pages/accounts/AuditLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Badge,
  Spinner,
  Table,
  Modal,
} from "react-bootstrap";
import { FaCog, FaSearch, FaSync } from "react-icons/fa";
import { API_URL } from "../../../config";
import { fetchAccounts } from "../../features/accounts/accountSlice";

const TYPE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "login", label: "Login" },
  { key: "draft", label: "Draft" },
  { key: "issue", label: "Issue" },
  { key: "anchor", label: "Anchor" },
];

const SOURCE_OPTIONS = [
  { key: "all", label: "All Sources" },
  { key: "auth", label: "Auth DB" },
  { key: "vc", label: "VC DB" },
  { key: "students", label: "Students DB" },
];

const PAGE_SIZES = [10, 20, 50, 100, 200];

function statusVariant(code) {
  const n = Number(code) || 0;
  if (n >= 200 && n < 300) return "success";
  if (n >= 300 && n < 400) return "info";
  if (n >= 400 && n < 500) return "warning";
  if (n >= 500) return "danger";
  return "secondary";
}
function sourceFromRouteTag(routeTag = "") {
  const v = String(routeTag).toLowerCase();
  if (v.startsWith("auth.")) return "auth";
  if (v.startsWith("vc.")) return "vc";
  if (v.startsWith("students.") || v.startsWith("stu.")) return "students";
  return "—";
}
function shortId(id) {
  if (!id) return "—";
  const s = String(id);
  return s.length <= 10 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
}
function isLikelyObjectId(s = "") {
  return /^[a-fA-F0-9]{24}$/.test(String(s).trim());
}

export default function AuditLogs() {
  const dispatch = useDispatch();
  const { id: actorIdParam } = useParams();
  const [urlParams, setUrlParams] = useSearchParams();

  const token = useSelector((s) => s.auth?.user?.token);

  // ===== Accounts (web users) for Admin Id filter =====
  const accountsState = useSelector((s) => s.accounts);
  const accounts = accountsState?.items || [];
  const accountsLoading = accountsState?.isLoading;

  useEffect(() => {
    // Load web users to use in Admin Id filter
    dispatch(fetchAccounts());
  }, [dispatch]);

  // ====== Query state ======
  const [q, setQ] = useState(urlParams.get("q") || "");
  const [qApplied, setQApplied] = useState(urlParams.get("q") || "");

  // Main filters (these trigger fetch when changed)
  const [type, setType] = useState(urlParams.get("type") || "all");
  const [source, setSource] = useState(urlParams.get("source") || "all");
  const [actorId, setActorId] = useState(() => {
    const fromUrl = urlParams.get("actorId") || "";
    if (actorIdParam && isLikelyObjectId(actorIdParam)) return actorIdParam;
    return fromUrl;
  });
  const [from, setFrom] = useState(urlParams.get("from") || "");
  const [to, setTo] = useState(urlParams.get("to") || "");
  const [limit, setLimit] = useState(
    PAGE_SIZES.includes(Number(urlParams.get("limit")))
      ? Number(urlParams.get("limit"))
      : 20
  );
  const [page, setPage] = useState(Number(urlParams.get("page")) || 1);

  // Table & network
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Details modal
  const [showDetails, setShowDetails] = useState(false);
  const [detail, setDetail] = useState(null);

  // Filters modal (local, so Cancel doesn't commit)
  const [showFilters, setShowFilters] = useState(false);
  const [mType, setMType] = useState(type);
  const [mSource, setMSource] = useState(source);
  const [mActorId, setMActorId] = useState(actorId);

  // Admin search input (search by name/username/email, sets actor id)
  const [mAdminQuery, setMAdminQuery] = useState("");
  const [mFrom, setMFrom] = useState(from);
  const [mTo, setMTo] = useState(to);
  const [mLimit, setMLimit] = useState(limit);
  const [showAdminSuggestions, setShowAdminSuggestions] = useState(false);

  useEffect(() => {
    // keep modal copies in sync when source states change externally
    setMType(type);
    setMSource(source);
    setMActorId(actorId);
    setMFrom(from);
    setMTo(to);
    setMLimit(limit);

    // Prefill admin display text if we have an actorId and accounts loaded
    if (actorId && accounts.length && !mAdminQuery) {
      const u = accounts.find((a) => String(a._id) === String(actorId));
      if (u) {
        setMAdminQuery(u.fullName || u.username || u.email || "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, source, actorId, from, to, limit, accounts]);

  // ===== Admin suggestions =====
  const adminMatches = useMemo(() => {
    const needle = mAdminQuery.trim().toLowerCase();
    if (!needle) return [];
    return accounts
      .filter((u) => {
        const hay = `${u.fullName || ""} ${u.username || ""} ${u.email || ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 8);
  }, [mAdminQuery, accounts]);

  const onPickAdmin = (u) => {
    setMActorId(String(u._id));
    setMAdminQuery(u.fullName || u.username || u.email || String(u._id));
    setShowAdminSuggestions(false);
  };

  // ====== URL sync ======
  const applyToUrl = () => {
    const p = new URLSearchParams();
    if (qApplied.trim()) p.set("q", qApplied.trim());
    if (type !== "all") p.set("type", type);
    if (source !== "all") p.set("source", source);
    if (actorId.trim()) p.set("actorId", actorId.trim());
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("limit", String(limit));
    p.set("page", String(page));
    setUrlParams(p);
  };

  // ====== Fetch ======
  const fetchLogs = async (signal) => {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const params = { page, limit };
      if (qApplied.trim()) params.q = qApplied.trim();
      if (type !== "all") params.type = type;
      if (source !== "all") params.source = source;
      if (actorId.trim()) params.actorId = actorId.trim();
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await axios.get(`${API_URL}/api/web/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        signal,
      });

      const data = res.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      if (!axios.isCancel(e)) {
        setItems([]);
        setTotal(0);
        setErr(e?.response?.data?.message || e?.message || "Failed to load audit logs");
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on committed (applied) query state
  useEffect(() => {
    applyToUrl();
    const c = new AbortController();
    fetchLogs(c.signal);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, qApplied, type, source, actorId, from, to, page, limit]);

  // ====== Handlers ======
  const onApply = () => {
    setPage(1);
    setQApplied(q.trim());
  };

  const onReset = () => {
    setQ("");
    setQApplied("");
    setType("all");
    setSource("all");
    setActorId("");
    setFrom("");
    setTo("");
    setLimit(20);
    setPage(1);
  };

  const onOpenFilters = () => {
    // ensure modal copies are up-to-date
    setMType(type);
    setMSource(source);
    setMActorId(actorId);
    setMFrom(from);
    setMTo(to);
    setMLimit(limit);
    // Prefill admin display text on open
    if (actorId && accounts.length) {
      const u = accounts.find((a) => String(a._id) === String(actorId));
      setMAdminQuery(u ? (u.fullName || u.username || u.email || "") : "");
    } else {
      setMAdminQuery("");
    }
    setShowFilters(true);
  };

  const resolveActorIdFromQuery = () => {
    if (isLikelyObjectId(mAdminQuery)) return mAdminQuery.trim();
    return mActorId.trim();
  };

  const onSaveFilters = () => {
    // commit modal -> main states (triggers fetch via useEffect)
    const resolvedActor = resolveActorIdFromQuery();
    setType(mType);
    setSource(mSource);
    setActorId(resolvedActor);
    setFrom(mFrom);
    setTo(mTo);
    setLimit(mLimit);
    setPage(1);
    setShowFilters(false);
  };

  const prettyJson = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj ?? "");
    }
  };

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const startIdx = useMemo(() => (total ? (page - 1) * limit + 1 : 0), [page, limit, total]);
  const endIdx = useMemo(
    () => Math.min(total, (page - 1) * limit + (items?.length || 0)),
    [page, limit, total, items]
  );

  // Validation: if user typed something but did not pick a user and also didn't paste a valid ObjectId
  const actorInputInvalid =
    Boolean(mAdminQuery) && !isLikelyObjectId(mAdminQuery) && !mActorId;

  // ====== UI ======
  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Audit Logs</h1>
        <div className="d-flex align-items-center gap-2">
          <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); onApply(); }}>
            <Form.Control
              placeholder="Search path, tag, ip, UA, method, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 320 }}
            />
            <Button type="submit" variant="primary" className="ms-2">
              <FaSearch className="me-1" /> Apply
            </Button>
            <Button type="button" variant="outline-secondary" className="ms-2" onClick={onReset}>
              Reset
            </Button>
          </Form>

          <Button
            type="button"
            variant="outline-secondary"
            className="ms-2"
            onClick={() => {
              const c = new AbortController();
              fetchLogs(c.signal);
            }}
            disabled={loading}
            title="Reload"
          >
            {loading ? <Spinner size="sm" animation="border" /> : <><FaSync className="me-1" /> Reload</>}
          </Button>

          <Button
            type="button"
            variant="outline-dark"
            className="ms-1"
            onClick={onOpenFilters}
            title="Filters"
          >
            <FaCog className="me-1" /> Settings
          </Button>
        </div>
      </div>

      {err && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {err}
        </div>
      )}

      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <strong>Results</strong>
          <span className="text-muted small">
            {total ? `Showing ${startIdx}–${endIdx} of ${total}` : "No results"}
          </span>
        </Card.Header>
        <Card.Body className="p-0">
  <div className="table-responsive">
    <Table hover responsive className="mb-0 align-middle">
      <thead className="table-light">
        <tr>
          <th style={{ width: 40 }}>#</th>
          <th>Actor</th>
          <th>Method</th>
          <th>Date</th>
          <th style={{ width: 80 }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            {/* 5 columns now */}
            <td colSpan={5} className="text-center py-4">
              <Spinner animation="border" className="me-2" /> Loading…
            </td>
          </tr>
        ) : items.length ? (
          items.map((row, idx) => {
            const i = startIdx + idx;
            const ts = row?.ts ? new Date(row.ts) : null;
            const role = row?.actorRole || "—";
            const actor = row?.actorId ? shortId(row.actorId) : "—";
            const method = row?.method || "—";

            return (
              <tr
                key={row?._id || `${i}-${row?.ts || Math.random()}`}
              >
                {/* # */}
                <td className="text-muted">{i}</td>

                {/* Actor */}
                <td>
                  <div className="d-flex flex-column">
                    <span title={String(row?.actorId || "")}>{actor}</span>
                    <span className="text-muted small">{role}</span>
                  </div>
                </td>

                {/* Method */}
                <td>
                  <Badge bg="dark">{method}</Badge>
                </td>

                {/* Date / Time */}
                <td title={row?.ts || ""}>
                  {ts ? ts.toLocaleString() : "—"}
                </td>

                {/* Action */}
                <td>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => {
                      setDetail(row);
                      setShowDetails(true);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            {/* 5 columns now */}
            <td colSpan={5} className="text-center py-4 text-muted">
              No audit records found.
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
</Card.Body>


        {/* Footer with pagination */}
        <Card.Footer className="d-flex align-items-center justify-content-between">
          <div className="text-muted small">Page {page} of {pageCount}</div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setPage(1)} disabled={page <= 1 || loading}>
              « First
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
              ‹ Prev
            </Button>
            <Form.Control
              size="sm"
              style={{ width: 80 }}
              type="number"
              min={1}
              max={pageCount}
              value={page}
              onChange={(e) => {
                const pc = pageCount;
                const v = Math.min(pc, Math.max(1, Number(e.target.value) || 1));
                setPage(v);
              }}
              disabled={loading || pageCount <= 1}
            />
            <Button size="sm" variant="outline-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount || loading}>
              Next ›
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setPage(Math.max(1, pageCount))} disabled={page >= pageCount || loading}>
              Last »
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* ===== Filters Modal (Settings) ===== */}
      <Modal show={showFilters} onHide={() => setShowFilters(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label className="mb-1">Type</Form.Label>
              <Form.Select value={mType} onChange={(e) => setMType(e.target.value)}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label className="mb-1">Source</Form.Label>
              <Form.Select value={mSource} onChange={(e) => setMSource(e.target.value)}>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </Form.Select>
            </Col>

            {/* Admin Id picker (search by name/username/email → sets Actor ID) */}
            <Col md={12}>
              <Form.Label className="mb-1">Admin Id</Form.Label>
              <div style={{ position: "relative" }}>
                <Form.Control
                  placeholder="Type a name / username / email, or paste ObjectId"
                  value={mAdminQuery}
                  onChange={(e) => {
                    setMAdminQuery(e.target.value);
                    setMActorId(""); // clear selection until a suggestion is chosen
                    setShowAdminSuggestions(true);
                  }}
                  onFocus={() => setShowAdminSuggestions(true)}
                  autoComplete="off"
                  isInvalid={actorInputInvalid}
                />
                <Form.Control.Feedback type="invalid">
                  Pick an admin from the list or paste a valid 24-char ObjectId.
                </Form.Control.Feedback>

                {/* Selected badge */}
                {mActorId ? (
                  <div className="mt-1">
                    <Badge bg="secondary">
                      Selected Actor ID: {shortId(mActorId)}
                    </Badge>
                    <Button
                      variant="link"
                      className="p-0 ms-2"
                      onClick={() => { setMActorId(""); setMAdminQuery(""); }}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null}

                {/* Suggestions dropdown */}
                {showAdminSuggestions && adminMatches.length > 0 && (
                  <div
                    className="border bg-white rounded shadow-sm mt-1"
                    style={{
                      position: "absolute",
                      zIndex: 1050,
                      left: 0,
                      right: 0,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {adminMatches.map((u) => {
                      const primary = u.fullName || u.username || u.email || "(unnamed)";
                      const secondary = [u.username, u.email].filter(Boolean).join(" · ");
                      return (
                        <button
                          key={u._id}
                          type="button"
                          className="w-100 text-start btn btn-light border-0"
                          onClick={() => onPickAdmin(u)}
                          style={{ padding: "8px 10px" }}
                          title={String(u._id)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-semibold">{primary}</div>
                              <div className="text-muted small">{secondary || "—"}</div>
                            </div>
                            <Badge bg="light" text="dark">{shortId(u._id)}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Helper / loading */}
              <div className="form-text">
                {accountsLoading ? "Loading admins…" : "Search admins by name, username, or email."}
              </div>
            </Col>

            <Col md={6}>
              <Form.Label className="mb-1">From</Form.Label>
              <Form.Control type="date" value={mFrom} onChange={(e) => setMFrom(e.target.value)} />
            </Col>
            <Col md={6}>
              <Form.Label className="mb-1">To</Form.Label>
              <Form.Control type="date" value={mTo} onChange={(e) => setMTo(e.target.value)} />
            </Col>

            <Col md={12}>
              <Form.Label className="mb-1">Rows per page</Form.Label>
              <Form.Select value={mLimit} onChange={(e) => setMLimit(Number(e.target.value))}>
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFilters(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={onSaveFilters}
            disabled={actorInputInvalid}
          >
            Save Filters
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== Details Modal ===== */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Audit Entry Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!detail ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <div className="text-muted small">Timestamp</div>
                  <div>{detail.ts ? new Date(detail.ts).toLocaleString() : "—"}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted small">Status</div>
                  <div><Badge bg={statusVariant(detail.status)}>{detail.status ?? "—"}</Badge></div>
                </Col>
                <Col md={3}>
                  <div className="text-muted small">Latency</div>
                  <div>{(Number(detail.latencyMs) || 0).toLocaleString()} ms</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <div className="text-muted small">Actor</div>
                  <div title={String(detail.actorId || "")}>
                    {shortId(detail.actorId)} <span className="text-muted">({detail.actorRole || "—"})</span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-muted small">IP</div>
                  <div>{detail.ip || "—"}</div>
                </Col>
                <Col md={4}>
                  <div className="text-muted small">User Agent</div>
                  <div className="text-truncate" title={detail.ua || ""}>{detail.ua || "—"}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={3}>
                  <div className="text-muted small">Method</div>
                  <div><Badge bg="dark">{detail.method || "—"}</Badge></div>
                </Col>
                <Col md={6}>
                  <div className="text-muted small">Path</div>
                  <div className="text-break">{detail.path || "—"}</div>
                </Col>
                <Col md={3}>
                  <div className="text-muted small">Route Tag</div>
                  <div className="text-break">{detail.routeTag || "—"}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <div className="text-muted small">Draft ID</div>
                  <div className="text-break">{detail.draftId || "—"}</div>
                </Col>
                <Col md={4}>
                  <div className="text-muted small">Payment ID</div>
                  <div className="text-break">{detail.paymentId || "—"}</div>
                </Col>
                <Col md={4}>
                  <div className="text-muted small">VC ID</div>
                  <div className="text-break">{detail.vcId || "—"}</div>
                </Col>
              </Row>

              <div className="mb-3">
                <div className="text-muted small">Query Params</div>
                <pre className="bg-light p-2 rounded small mb-0">{prettyJson(detail.query)}</pre>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Route Params</div>
                <pre className="bg-light p-2 rounded small mb-0">{prettyJson(detail.params)}</pre>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Body Keys</div>
                <pre className="bg-light p-2 rounded small mb-0">{prettyJson(detail.bodyKeys)}</pre>
              </div>
              <div>
                <div className="text-muted small">Meta</div>
                <pre className="bg-light p-2 rounded small mb-0">{prettyJson(detail.meta)}</pre>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

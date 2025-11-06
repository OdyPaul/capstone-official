// src/pages/accounts/AuditLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
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
  const { id: actorIdParam } = useParams();
  const [urlParams, setUrlParams] = useSearchParams();

  const token = useSelector((s) => s.auth?.user?.token);

  // ====== Query state ======
  // Search input & "applied" search (Apply button commits q -> qApplied)
  const [q, setQ] = useState(urlParams.get("q") || "");
  const [qApplied, setQApplied] = useState(urlParams.get("q") || "");

  // Main filters (these trigger fetch when changed)
  const [type, setType] = useState(urlParams.get("type") || "all");
  const [source, setSource] = useState(urlParams.get("source") || "all");
  const [actorId, setActorId] = useState(() => {
    const fromUrl = urlParams.get("actorId") || "";
    // route param wins if valid
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
  const [mFrom, setMFrom] = useState(from);
  const [mTo, setMTo] = useState(to);
  const [mLimit, setMLimit] = useState(limit);

  useEffect(() => {
    // keep modal copies in sync when source states change externally
    setMType(type);
    setMSource(source);
    setMActorId(actorId);
    setMFrom(from);
    setMTo(to);
    setMLimit(limit);
  }, [type, source, actorId, from, to, limit]);

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
      const params = {
        page,
        limit,
      };
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
    setShowFilters(true);
  };

  const onSaveFilters = () => {
    // commit modal -> main states (triggers fetch via useEffect)
    setType(mType);
    setSource(mSource);
    setActorId(mActorId.trim());
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
  const endIdx = useMemo(() => Math.min(total, (page - 1) * limit + (items?.length || 0)), [page, limit, total, items]);

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
                  <th>Time</th>
                  <th>Source</th>
                  <th>Actor</th>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Route Tag</th>
                  <th>IP</th>
                  <th style={{ width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-4">
                      <Spinner animation="border" className="me-2" /> Loading…
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((row, idx) => {
                    const i = startIdx + idx;
                    const ts = row?.ts ? new Date(row.ts) : null;
                    const src = sourceFromRouteTag(row?.routeTag);
                    const role = row?.actorRole || "—";
                    const actor = row?.actorId ? shortId(row.actorId) : "—";
                    const method = row?.method || "—";
                    const path = row?.path || "—";
                    const status = row?.status ?? "—";
                    const latency = Number(row?.latencyMs) || 0;
                    const tag = row?.routeTag || "—";
                    const ip = row?.ip || "—";
                    return (
                      <tr key={row?._id || `${i}-${row?.ts || Math.random()}`}>
                        <td className="text-muted">{i}</td>
                        <td title={row?.ts || ""}>{ts ? ts.toLocaleString() : "—"}</td>
                        <td>{src !== "—" ? <Badge bg="secondary">{src}</Badge> : "—"}</td>
                        <td>
                          <div className="d-flex flex-column">
                            <span title={String(row?.actorId || "")}>{actor}</span>
                            <span className="text-muted small">{role}</span>
                          </div>
                        </td>
                        <td><Badge bg="dark">{method}</Badge></td>
                        <td className="text-truncate" style={{ maxWidth: 280 }} title={path}>{path}</td>
                        <td><Badge bg={statusVariant(status)}>{status}</Badge></td>
                        <td title={`${latency} ms`}>{latency.toLocaleString()} ms</td>
                        <td className="text-truncate" style={{ maxWidth: 200 }} title={tag}>{tag}</td>
                        <td title={ip}>{ip}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => { setDetail(row); setShowDetails(true); }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-muted">
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
          <div className="text-muted small">Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
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
              max={Math.max(1, Math.ceil(total / limit))}
              value={page}
              onChange={(e) => {
                const pc = Math.max(1, Math.ceil(total / limit));
                const v = Math.min(pc, Math.max(1, Number(e.target.value) || 1));
                setPage(v);
              }}
              disabled={loading || Math.ceil(total / limit) <= 1}
            />
            <Button size="sm" variant="outline-secondary" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit) || loading}>
              Next ›
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setPage(Math.max(1, Math.ceil(total / limit)))} disabled={page >= Math.ceil(total / limit) || loading}>
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

            <Col md={12}>
              <Form.Label className="mb-1">Actor ID</Form.Label>
              <Form.Control
                placeholder="Mongo ObjectId"
                value={mActorId}
                onChange={(e) => setMActorId(e.target.value)}
                isInvalid={mActorId && !isLikelyObjectId(mActorId)}
              />
              {mActorId && !isLikelyObjectId(mActorId) && (
                <Form.Control.Feedback type="invalid">
                  Must be a 24-character hex ObjectId
                </Form.Control.Feedback>
              )}
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
            disabled={!!(mActorId && !isLikelyObjectId(mActorId))}
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

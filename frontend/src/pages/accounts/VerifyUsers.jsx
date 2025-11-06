// src/pages/accounts/VerifyUsers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
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
  InputGroup,
  ListGroup,
} from "react-bootstrap";
import {
  FaSearch,
  FaSync,
  FaCog,
  FaEye,
  FaCheck,
  FaTimes,
  FaLink,
} from "react-icons/fa";
import { API_URL } from "../../../config";

// ---------- Config ----------
const VPATH = `${API_URL}/api/verification-request`; // server mounts this in backend/server.js

// ---------- Local helpers ----------
const PAGE_SIZES = [10, 20, 50, 100];
const statusVariant = (s) =>
  s === "verified" ? "success" : s === "rejected" ? "danger" : "secondary";
const safe = (v) => (v == null ? "—" : String(v));
const shortId = (id) => {
  if (!id) return "—";
  const s = String(id);
  return s.length <= 10 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
};

// basic name similarity (Jaccard on token sets)
function nameSimilarity(a = "", b = "") {
  const toTokens = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const A = new Set(toTokens(a));
  const B = new Set(toTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => {
    if (B.has(t)) inter += 1;
  });
  const union = new Set([...A, ...B]).size;
  return inter / union;
}

export default function VerifyUsers() {
  const { user } = useSelector((s) => s.auth);
  const token = user?.token;

  // toolbar / list state
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]); // current page items from API
  const [totalRemote, setTotalRemote] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showSettings, setShowSettings] = useState(false);

  // modal state
  const [showVerify, setShowVerify] = useState(false);
  const [current, setCurrent] = useState(null); // detailed request
  const [loadingCurrent, setLoadingCurrent] = useState(false);

  // student search (right card)
  const [stuQ, setStuQ] = useState("");
  const [stuLoading, setStuLoading] = useState(false);
  const [stuResults, setStuResults] = useState([]);
  const [pickedStudent, setPickedStudent] = useState(null);
  const stuSearchRef = useRef(null);

  // reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const authz = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // fetch list (admin) — server-side pagination + filtering
  const fetchRequests = async () => {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(VPATH, {
        ...authz,
        params: {
          page,
          limit,
          q: q.trim() || undefined,
        },
      });
      const { items: rows, total } = res.data || {};
      setItems(Array.isArray(rows) ? rows : []);
      setTotalRemote(Number.isFinite(total) ? total : 0);
    } catch (e) {
      setItems([]);
      setTotalRemote(0);
      setErr(e?.response?.data?.message || e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  // open one request
  const openVerify = async (reqId) => {
    setShowVerify(true);
    setPickedStudent(null);
    setStuQ("");
    setStuResults([]);
    setLoadingCurrent(true);
    try {
      const res = await axios.get(`${VPATH}/${reqId}`, authz);
      setCurrent(res.data);
    } catch (e) {
      setCurrent(null);
      setErr(e?.response?.data?.message || e?.message || "Failed to open request");
    } finally {
      setLoadingCurrent(false);
      // focus student search after open
      setTimeout(() => stuSearchRef.current?.focus(), 350);
    }
  };

  // server-side totals/paging
  const total = totalRemote;
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, limit)));
  const pageRows = items; // API already returned paginated items

  // auto-refetch on page/limit/q changes
  useEffect(() => {
    if (!token) return;
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, limit, q]);

  // student search
  const searchStudents = async (qq) => {
    if (!token) return [];
    const query = String(qq || "").trim();
    if (!query) {
      setStuResults([]);
      return [];
    }
    setStuLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/web/student/search`, {
        ...authz,
        params: { q: query },
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      setStuResults(arr);
      return arr;
    } catch (e) {
      setStuResults([]);
      return [];
    } finally {
      setStuLoading(false);
    }
  };

  // auto-match by full name + heuristics
  const autoMatch = async () => {
    if (!current) return;
    const full = current?.personal?.fullName || current?.user?.fullName || "";
    if (!full) return;
    setStuQ(full);
    const arr = await searchStudents(full); // use fresh results to avoid race
    const scored = (arr || []).map((s) => {
      let score = nameSimilarity(full, s?.fullName || "");
      const gradYearReq = (current?.education?.graduationDate || "").slice(0, 4);
      const gradYearStu = s?.dateGraduated ? new Date(s.dateGraduated).getFullYear() : null;
      if (gradYearReq && gradYearStu && String(gradYearStu) === String(gradYearReq)) score += 0.15;
      return { s, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]?.s || null;
    if (top) setPickedStudent(top);
  };

  // verify action (queued = 202)
  const doVerify = async () => {
    if (!current?._id || !pickedStudent?._id) return;
    setActing(true);
    try {
      const r = await axios.post(
        `${VPATH}/${current._id}/verify`,
        { studentId: pickedStudent._id },
        authz
      );
      if (r?.status === 202) alert("Verification queued.");
      setShowVerify(false);
      setCurrent(null);
      setPickedStudent(null);
      await fetchRequests(); // refresh list
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to verify");
    } finally {
      setActing(false);
    }
  };

  // reject action (queued = 202)
  const doReject = async () => {
    if (!current?._id || !rejectReason.trim()) return;
    setActing(true);
    try {
      const r = await axios.post(
        `${VPATH}/${current._id}/reject`,
        { reason: rejectReason.trim() },
        authz
      );
      if (r?.status === 202) alert("Rejection queued.");
      setShowReject(false);
      setShowVerify(false);
      setCurrent(null);
      setPickedStudent(null);
      setRejectReason("");
      await fetchRequests();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to reject");
    } finally {
      setActing(false);
    }
  };

  return (
    <section className="container py-4">
      {/* Header & toolbar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Verify Users (Mobile Requests)</h1>
        <div className="d-flex align-items-center gap-2">
          <Form
            className="d-flex"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchRequests();
            }}
          >
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by name, email, DID, status…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                style={{ width: 320 }}
              />
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => {
                  setQ("");
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </InputGroup>
          </Form>

          <Button
            type="button"
            variant="outline-primary"
            onClick={fetchRequests}
            disabled={loading}
            title="Refresh"
          >
            {loading ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <>
                <FaSync className="me-1" /> Refresh
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline-dark"
            onClick={() => setShowSettings(true)}
            title="Settings"
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

      {/* Table */}
      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <strong>Verification Requests</strong>
          <span className="text-muted small">
            {total ? `Total ${total}` : "No requests"}
          </span>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Submitted</th>
                  <th>User</th>
                  <th>DID</th>
                  <th>Status</th>
                  <th style={{ width: 160 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" className="me-2" /> Loading…
                    </td>
                  </tr>
                ) : pageRows.length ? (
                  pageRows.map((r, idx) => {
                    const i = (page - 1) * limit + idx + 1;
                    const ts = r?.createdAt ? new Date(r.createdAt) : null;
                    const u = r?.user || {};
                    return (
                      <tr key={r?._id || i}>
                        <td className="text-muted">{i}</td>
                        <td title={r?.createdAt || ""}>
                          {ts ? ts.toLocaleString() : "—"}
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold">
                              {u?.fullName || u?.username || "—"}
                            </span>
                            <span className="text-muted small">{u?.email || "—"}</span>
                            <span className="text-muted small">{shortId(u?._id)}</span>
                          </div>
                        </td>
                        <td
                          className="text-truncate"
                          style={{ maxWidth: 220 }}
                          title={r?.did || ""}
                        >
                          {r?.did || "—"}
                        </td>
                        <td>
                          <Badge bg={statusVariant(r?.status)}>
                            {r?.status || "pending"}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => openVerify(r._id)}
                              title="Open"
                            >
                              <FaEye className="me-1" />
                              Open
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No verification requests found.
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

      {/* Settings modal (placeholder) */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>List Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted">No additional settings yet.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettings(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Verify / Compare modal */}
      <Modal
        show={showVerify}
        onHide={() => setShowVerify(false)}
        centered
        size="xl"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Verify Account & Link Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingCurrent ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : !current ? (
            <div className="text-muted">No data.</div>
          ) : (
            <Row className="g-3">
              {/* LEFT: Mobile request (to verify) */}
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light">
                    <strong>Mobile Submission</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <div className="text-muted small">Request ID</div>
                      <div>
                        {shortId(current._id)}{" "}
                        <Badge
                          bg={statusVariant(current.status)}
                          className="ms-2"
                        >
                          {current.status}
                        </Badge>
                      </div>
                    </div>

                    <Row className="mb-3">
                      <Col md={6}>
                        <div className="text-muted small">Full Name</div>
                        <div className="fw-semibold">
                          {safe(current?.personal?.fullName)}
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="text-muted small">Birth Date</div>
                        <div>
                          {current?.personal?.birthDate
                            ? new Date(
                                current.personal.birthDate
                              ).toLocaleDateString()
                            : "—"}
                        </div>
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col md={12}>
                        <div className="text-muted small">Address</div>
                        <div>{safe(current?.personal?.address)}</div>
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col md={6}>
                        <div className="text-muted small">High School</div>
                        <div>{safe(current?.education?.highSchool)}</div>
                      </Col>
                      <Col md={3}>
                        <div className="text-muted small">Admission</div>
                        <div>{safe(current?.education?.admissionDate)}</div>
                      </Col>
                      <Col md={3}>
                        <div className="text-muted small">Graduation</div>
                        <div>{safe(current?.education?.graduationDate)}</div>
                      </Col>
                    </Row>

                    <Row className="g-3">
                      <Col md={6}>
                        <div className="text-muted small mb-1">Selfie Image</div>
                        {current?.selfieImage?.url ? (
                          <a
                            href={current.selfieImage.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={current.selfieImage.url}
                              alt="Selfie"
                              style={{
                                width: "100%",
                                maxHeight: 220,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #eee",
                              }}
                            />
                          </a>
                        ) : (
                          <div className="text-muted">—</div>
                        )}
                      </Col>
                      <Col md={6}>
                        <div className="text-muted small mb-1">ID Image</div>
                        {current?.idImage?.url ? (
                          <a
                            href={current.idImage.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={current.idImage.url}
                              alt="ID"
                              style={{
                                width: "100%",
                                maxHeight: 220,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #eee",
                              }}
                            />
                          </a>
                        ) : (
                          <div className="text-muted">—</div>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              {/* RIGHT: Pick / Compare Student */}
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <strong>Pick Student to Link</strong>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={autoMatch}
                      title="Auto-match by name & year"
                    >
                      <FaLink className="me-1" />
                      Auto-match
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    <Form
                      onSubmit={(e) => {
                        e.preventDefault();
                        searchStudents(stuQ);
                      }}
                    >
                      <InputGroup className="mb-3">
                        <InputGroup.Text>
                          <FaSearch />
                        </InputGroup.Text>
                        <Form.Control
                          ref={stuSearchRef}
                          placeholder="Search student by full name, number, program…"
                          value={stuQ}
                          onChange={(e) => setStuQ(e.target.value)}
                        />
                        <Button type="submit" variant="primary" disabled={stuLoading}>
                          {stuLoading ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            "Search"
                          )}
                        </Button>
                      </InputGroup>
                    </Form>

                    <Row className="g-3">
                      <Col md={6}>
                        <div className="text-muted small mb-1">Search Results</div>
                        <div
                          className="border rounded"
                          style={{ maxHeight: 260, overflow: "auto" }}
                        >
                          {stuLoading ? (
                            <div className="p-3 text-center">
                              <Spinner animation="border" />
                            </div>
                          ) : (stuResults || []).length ? (
                            <ListGroup variant="flush">
                              {stuResults.slice(0, 20).map((s) => (
                                <ListGroup.Item
                                  key={s._id}
                                  action
                                  active={pickedStudent?._id === s._id}
                                  onClick={() => setPickedStudent(s)}
                                  className="d-flex justify-content-between align-items-center"
                                >
                                  <div className="me-2">
                                    <div className="fw-semibold">
                                      {s.fullName || "Unnamed"}
                                    </div>
                                    <div className="text-muted small">
                                      {s.studentNumber || "—"} • {s.program || "—"}
                                    </div>
                                  </div>
                                  <Badge bg="secondary">{shortId(s._id)}</Badge>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          ) : (
                            <div className="p-3 text-muted small">No results.</div>
                          )}
                        </div>
                      </Col>

                      <Col md={6}>
                        <div className="text-muted small mb-1">Selected Student</div>
                        {pickedStudent ? (
                          <div className="border rounded p-2">
                            {pickedStudent.photoUrl ? (
                              <img
                                src={pickedStudent.photoUrl}
                                alt="Student"
                                style={{
                                  width: "100%",
                                  maxHeight: 160,
                                  objectFit: "cover",
                                  borderRadius: 6,
                                  border: "1px solid #eee",
                                }}
                              />
                            ) : null}
                            <div className="mt-2">
                              <div className="fw-semibold">
                                {pickedStudent.fullName}
                              </div>
                              <div className="text-muted small">
                                #{pickedStudent.studentNumber || "—"} •{" "}
                                {pickedStudent.program || "—"}
                              </div>
                              <div className="text-muted small">
                                Grad:{" "}
                                {pickedStudent.dateGraduated
                                  ? new Date(
                                      pickedStudent.dateGraduated
                                    ).toLocaleDateString()
                                  : "—"}
                              </div>
                              <div className="text-muted small">
                                ID: {shortId(pickedStudent._id)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted small">
                            Pick a student from the list.
                          </div>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small">
            {current?.did ? (
              <>
                DID: <span className="text-monospace">{current.did}</span>
              </>
            ) : null}
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-danger"
              onClick={() => setShowReject(true)}
              disabled={!current || acting}
              title="Reject this request"
            >
              <FaTimes className="me-1" />
              Reject
            </Button>
            <Button
              variant="success"
              onClick={doVerify}
              disabled={!current || !pickedStudent || acting}
              title="Verify & Link to selected student"
            >
              {acting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : (
                <FaCheck className="me-1" />
              )}
              Verify & Link
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Reject reason modal */}
      <Modal show={showReject} onHide={() => setShowReject(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              maxLength={240}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional: why is this request rejected?"
            />
            <Form.Text className="text-muted">
              This reason may be shown to the requester.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowReject(false)}
            disabled={acting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={doReject}
            disabled={acting || !current}
          >
            {acting ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : (
              <FaTimes className="me-1" />
            )}
            Reject Request
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

// src/pages/accounts/VerifyUsers.jsx
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import {
  fetchVerifyList,
  fetchVerifyById,
  verifyVerifyRequest,
  rejectVerifyRequest,
  selectVerifyList,
  selectVerifyTotal,
  selectVerifyListLoading,
  selectVerifyError,
  selectVerifyCurrent,
  selectVerifyCurrentLoading,
  selectVerifyActing,
} from "../../features/verify/verifySlice";
import {
  searchStudents as searchStudentsThunk,
  clearSearchResults,
} from "../../features/student/studentSlice";
import { NavLink } from "react-router-dom";

// ---------- Defaults for "Reset" ----------
const DEFAULTS = {
  q: "",
  status: "unverified", // UI status (maps to API "pending")
  page: 1,
  limit: 20,
};

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

// Turn "First Middle Last" into "First M. Last" for display/search

const toMiddleInitialName = (fullName = "") => {
  const parts = String(fullName || "").trim().split(/\s+/);
  if (parts.length < 3) return fullName; // no clear middle name

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1).join(" "); // supports multi-word middle names
  const initial = middle ? middle[0].toUpperCase() : "";

  // 👈 no "." here, just the letter
  return initial ? `${first} ${initial} ${last}` : fullName;
};



export default function VerifyUsers() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const token = user?.token;

  // from verify slice
  const items = useSelector(selectVerifyList);
  const totalRemote = useSelector(selectVerifyTotal);
  const loading = useSelector(selectVerifyListLoading);
  const { isError, message: errMessage } = useSelector(selectVerifyError);
  const current = useSelector(selectVerifyCurrent);
  const loadingCurrent = useSelector(selectVerifyCurrentLoading);
  const acting = useSelector(selectVerifyActing);

  // from student slice (search results)
  const {
    searchResults: stuResults,
    isSearching: stuLoading,
  } = useSelector((s) => s.student);

  // toolbar / list state
  const [q, setQ] = useState(DEFAULTS.q);
  const [status, setStatus] = useState(DEFAULTS.status); // UI: Unverified (maps to pending)
  const [page, setPage] = useState(DEFAULTS.page);
  const [limit, setLimit] = useState(DEFAULTS.limit);
  const [showSettings, setShowSettings] = useState(false);

  // modal state
  const [showVerify, setShowVerify] = useState(false);

  // student search (right card)
  const [stuQ, setStuQ] = useState("");
  const [pickedStudent, setPickedStudent] = useState(null);
  const [stuViewMode, setStuViewMode] = useState("table"); // "table" | "detail"
  const stuSearchRef = useRef(null);

  // reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // fetch list (admin) — server-side pagination + filtering via Redux thunk
  const fetchRequests = () => {
    if (!token) return;
    dispatch(
      fetchVerifyList({
        page,
        limit,
        status,
        q: q.trim(),
      })
    );
  };

  // open one request
  const openVerify = (reqId) => {
    setShowVerify(true);
    setPickedStudent(null);
    setStuQ("");
    setStuViewMode("table");
    dispatch(clearSearchResults());
    dispatch(fetchVerifyById(reqId));
    setTimeout(() => stuSearchRef.current?.focus(), 350);
  };

  // totals/paging
  const total = totalRemote;
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(0, total) / Math.max(1, limit))
  );
  const pageRows = items;

  // auto-refetch on key changes
  useEffect(() => {
    if (!token) return;
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, limit, q, status]);

  // student search via Redux thunk
  const runStudentSearch = async (qq) => {
    if (!token) return [];
    const query = String(qq || "").trim();
    if (!query) {
      dispatch(clearSearchResults());
      return [];
    }
    try {
      const results = await dispatch(
        searchStudentsThunk({ q: query })
      ).unwrap();
      setStuViewMode("table");
      return Array.isArray(results) ? results : [];
    } catch {
      // error is kept in studentSlice.searchError
      return [];
    }
  };

  const autoMatch = async () => {
  if (!current) return;

  // Raw full name from the mobile request / user
  const rawFull =
    current?.personal?.fullName || current?.user?.fullName || "";
  if (!rawFull.trim()) return;

  // Normalize to "First M. Last" because that's how names are stored in the DB
  const searchName = toMiddleInitialName(rawFull);

  // Show this normalized name in the search box
  setStuQ(searchName);

  // Run the student search with the normalized name
  const arr = await runStudentSearch(searchName);
  if (!Array.isArray(arr) || !arr.length) return;

  const scored = arr.map((s) => {
    // Compare using the normalized name vs student fullName
    let score = nameSimilarity(searchName, s?.fullName || "");

    // Slight boost if graduation year matches
    const gradYearReq = (current?.education?.graduationDate || "").slice(0, 4);
    const gradYearStu = s?.dateGraduated
      ? new Date(s.dateGraduated).getFullYear()
      : null;

    if (
      gradYearReq &&
      gradYearStu &&
      String(gradYearStu) === String(gradYearReq)
    ) {
      score += 0.15;
    }

    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.s || null;

  if (top) {
    setPickedStudent(top);
    setStuViewMode("detail");
  }
};


  // actions
  const doVerify = async () => {
    if (!current?._id || !pickedStudent?._id) return;
    try {
      const res = await dispatch(
        verifyVerifyRequest({
          id: current._id,
          studentId: pickedStudent._id,
        })
      ).unwrap();

      if (res?.api?.queued) {
        alert("Verification queued.");
      } else {
        alert("Verification submitted.");
      }

      setShowVerify(false);
      setPickedStudent(null);
      dispatch(clearSearchResults());
      // slice will optimistically update status
    } catch (e) {
      alert(e || "Failed to verify");
    }
  };

  const doReject = async () => {
    if (!current?._id || !rejectReason.trim()) return;
    try {
      const res = await dispatch(
        rejectVerifyRequest({
          id: current._id,
          reason: rejectReason.trim(),
        })
      ).unwrap();

      if (res?.api?.queued) {
        alert("Rejection queued.");
      } else {
        alert("Rejection submitted.");
      }

      setShowReject(false);
      setShowVerify(false);
      setPickedStudent(null);
      setRejectReason("");
      dispatch(clearSearchResults());
      // slice will optimistically update status
    } catch (e) {
      alert(e || "Failed to reject");
    }
  };

  // Reset → restore defaults
  const resetAll = () => {
    setQ(DEFAULTS.q);
    setStatus(DEFAULTS.status);
    setPage(DEFAULTS.page);
    setLimit(DEFAULTS.limit);
    // useEffect will refetch with new state
  };

  const statusLabel =
    status === "unverified"
      ? "Unverified (Pending)"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <section className="container py-4">
      {/* Title row */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h1 className="h4 mb-0">Verify Users (Mobile Requests)</h1>

          <Button
          as={NavLink}
          to="/accounts/mobile-users"
          variant="outline-primary"
          className="d-flex align-items-center"
          style={{ textDecoration: "none" }}
        >
          <FaEye className="me-2" />
          View Mobile Accounts
        </Button>
      </div>

      {/* Search row with Refresh + Settings on the same row */}
      <Form
        className="mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          // useEffect will refetch
        }}
      >
        <InputGroup>
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            placeholder="Search by name, email, status…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <Button
            type="button"
            variant="outline-secondary"
            onClick={resetAll}
            title="Clear search and restore default filters"
          >
            Reset
          </Button>

          {/* Refresh & Settings inline */}
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
            title="Filters"
          >
            <FaCog className="me-1" /> Settings
          </Button>
        </InputGroup>
      </Form>

      {/* Filter tags under the search input (like StudentProfiles) */}
      <div className="mb-3 d-flex flex-wrap gap-2">
        {q ? (
          <Badge bg="light" text="dark">
            q: {q}
          </Badge>
        ) : (
          <Badge bg="light" text="dark">
            q: (empty)
          </Badge>
        )}
        <Badge bg="light" text="dark">
          Status: {statusLabel}
        </Badge>
        <Badge bg="light" text="dark">
          Page size: {limit}
        </Badge>
        <Badge bg="secondary">Total: {total}</Badge>
      </div>

      {isError && errMessage && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {errMessage}
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
                  <th>Status</th>
                  <th style={{ width: 160 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
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
                            <span className="text-muted small">
                              {u?.email || "—"}
                            </span>
                            <span className="text-muted small">
                              {shortId(u?._id)}
                            </span>
                          </div>
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
                    <td colSpan={5} className="text-center py-4 text-muted">
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

      {/* Settings modal */}
      <Modal
        show={showSettings}
        onHide={() => setShowSettings(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>List Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="unverified">Unverified (Pending)</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </Form.Select>
              <Form.Text className="text-muted">
                “Unverified” maps to pending verification requests.
              </Form.Text>
            </Form.Group>
          </Form>
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
              {/* LEFT: Mobile request */}
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
                          {safe(toMiddleInitialName(current?.personal?.fullName))}
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
                        <div className="text-muted small mb-1">
                          Selfie Image
                        </div>
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
                        runStudentSearch(stuQ);
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
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={stuLoading}
                        >
                          {stuLoading ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            "Search"
                          )}
                        </Button>
                      </InputGroup>
                    </Form>

                    {stuViewMode === "table" ? (
                      <>
                        <div className="text-muted small mb-1">
                          Search Results
                        </div>
                        <div
                          className="border rounded"
                          style={{ maxHeight: 320, overflow: "auto" }}
                        >
                          {stuLoading ? (
                            <div className="p-3 text-center">
                              <Spinner animation="border" />
                            </div>
                          ) : (stuResults || []).length ? (
                            <Table
                              hover
                              size="sm"
                              className="mb-0 align-middle"
                            >
                              <thead className="table-light">
                                <tr>
                                  <th style={{ width: 40 }}>#</th>
                                  <th>Name</th>
                                  <th>Student #</th>
                                  <th>Program</th>
                                  <th>Grad</th>
                                  <th style={{ width: 60 }}>View</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stuResults.map((s, idx) => (
                                  <tr key={s._id}>
                                    <td className="text-muted small">
                                      {idx + 1}
                                    </td>
                                    <td>{s.fullName || "—"}</td>
                                    <td>{s.studentNumber || "—"}</td>
                                    <td>{s.program || "—"}</td>
                                    <td>
                                      {s.dateGraduated
                                        ? new Date(
                                            s.dateGraduated
                                          ).getFullYear()
                                        : "—"}
                                    </td>
                                    <td>
                                      <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        title="View details"
                                        onClick={() => {
                                          setPickedStudent(s);
                                          setStuViewMode("detail");
                                        }}
                                      >
                                        <FaEye />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          ) : (
                            <div className="p-3 text-muted small">
                              No results.
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <div className="text-muted small">
                              Selected Student
                            </div>
                            <div className="fw-semibold">
                              {pickedStudent?.fullName || "—"}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => setStuViewMode("table")}
                          >
                            ‹ Back to results
                          </Button>
                        </div>
                        {pickedStudent ? (
                          <Row className="g-3">
                            <Col md={5}>
                              {pickedStudent.photoUrl ? (
                                <img
                                  src={pickedStudent.photoUrl}
                                  alt="Student"
                                  style={{
                                    width: "100%",
                                    maxHeight: 200,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                    border: "1px solid #eee",
                                  }}
                                />
                              ) : (
                                <div
                                  className="border rounded bg-light d-flex align-items-center justify-content-center"
                                  style={{ height: 200 }}
                                >
                                  <span className="text-muted small">
                                    No photo
                                  </span>
                                </div>
                              )}
                            </Col>
                            <Col md={7}>
                              <div className="mb-2">
                                <div className="text-muted small">
                                  Full Name
                                </div>
                                <div className="fw-semibold">
                                  {pickedStudent.fullName || "—"}
                                </div>
                              </div>
                              <div className="mb-2">
                                <div className="text-muted small">
                                  Student Number
                                </div>
                                <div>
                                  {pickedStudent.studentNumber || "—"}
                                </div>
                              </div>
                              <div className="mb-2">
                                <div className="text-muted small">Program</div>
                                <div>{pickedStudent.program || "—"}</div>
                              </div>
                              <div className="mb-2">
                                <div className="text-muted small">
                                  Graduation
                                </div>
                                <div>
                                  {pickedStudent.dateGraduated
                                    ? new Date(
                                        pickedStudent.dateGraduated
                                      ).toLocaleDateString()
                                    : "—"}
                                </div>
                              </div>
                              <div className="mb-2">
                                <div className="text-muted small">ID</div>
                                <div>{shortId(pickedStudent._id)}</div>
                              </div>
                            </Col>
                          </Row>
                        ) : (
                          <div className="text-muted small">
                            Pick a student from the search results.
                          </div>
                        )}
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small" />
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
              Verify &amp; Link
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Reject reason modal */}
      <Modal
        show={showReject}
        onHide={() => setShowReject(false)}
        centered
      >
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

// src/pages/CreateDrafts.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Table,
  Spinner,
  Badge,
  Alert,
} from "react-bootstrap";
import { FaSearch } from "react-icons/fa";

// ⬇️ Adjust this import to where your config actually lives.
import { API_URL } from "../../../../config";

import { getPassingStudents } from "../../../features/student/studentSlice";
import { createDrafts as createDraftsThunk } from "../../../features/draft_vc/vcSlice";

// Read-only Issuer (Vite env with safe fallbacks)
const ISSUER_NAME =
  import.meta.env.VITE_ISSUER_NAME ??
  "PAMPANGA-STATE-AGRICULTURAL-UNIVERSITY-REGISTRAR";
const ISSUER_DID =
  import.meta.env.VITE_ISSUER_DID ??
  "0x8494413D2a17a95eB8E155f5Bb4a38Ad7E5449Cf";

// Normalize template.type to "tor" | "diploma" | ""
const normalizeTemplateType = (value = "") => {
  const v = String(value).toLowerCase();
  if (v.includes("tor")) return "tor";
  if (v.includes("diploma")) return "diploma";
  return "";
};

export default function CreateDrafts() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth?.user?.token);

  // Students state from Redux
  const {
    students,
    isLoadingList: loadingStudents,
    isError: studentsError,
    message: studentsMessage,
  } = useSelector((s) => s.student);

  // Local UI state
  const [selectedRows, setSelectedRows] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("All");

  // Templates
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // VC type selector (TOR | Diploma) sent as "tor" | "diploma"
  const [vcTypeChoice, setVcTypeChoice] = useState("");

  // Settings
  const [purpose, setPurpose] = useState("");
  const [expiration, setExpiration] = useState("");
  const [anchorNow, setAnchorNow] = useState(false);

  // Programs derived from loaded students
  const programs = useMemo(
    () => Array.from(new Set(students.map((s) => s.program).filter(Boolean))),
    [students]
  );

  // Pagination (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentStudents = students.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));

  // Load students on mount (empty filter if none saved)
  useEffect(() => {
    const saved = localStorage.getItem("lastStudentFilters");
    dispatch(getPassingStudents(saved ? JSON.parse(saved) : {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Load templates for selector
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoadingTemplates(true);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${API_URL}/api/web/templates`, config);
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setTemplates(list);

        // Default-select first template + vc type
        if (list.length && !templateId) {
          const first = list[0];
          setTemplateId(first._id);
          const normalized = normalizeTemplateType(first?.type);
          setVcTypeChoice(normalized || "diploma");
        }
      } finally {
        setLoadingTemplates(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // When template changes, try to derive default VC type (user can override)
  useEffect(() => {
    if (!templateId) return;
    const local = templates.find((t) => t._id === templateId);
    const normalized = normalizeTemplateType(local?.type);
    if (normalized) {
      setVcTypeChoice(normalized);
      return;
    }
    // Fetch single template if type wasn’t in the list
    (async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(
          `${API_URL}/api/web/templates/${templateId}`,
          config
        );
        setVcTypeChoice(normalizeTemplateType(data?.type) || "diploma");
      } catch {
        setVcTypeChoice((prev) => prev || "diploma");
      }
    })();
  }, [templateId, templates, token]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    const filters = {
      ...(selectedProgram !== "All" && { programs: String(selectedProgram) }),
      ...(query && { q: query }),
    };
    localStorage.setItem("lastStudentFilters", JSON.stringify(filters));
    dispatch(getPassingStudents(filters));
    setCurrentPage(1);
  };

  const toggleRow = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAllOnPage = () => {
    const ids = currentStudents.map((s) => s._id);
    const allSelected = ids.every((id) => selectedRows.includes(id));
    setSelectedRows((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const clearSelection = () => setSelectedRows([]);

  // Create drafts (calls Redux thunk)
  const createDrafts = async () => {
    if (!templateId) return alert("Please select a VC template.");
    if (!vcTypeChoice) return alert("Please choose VC Type (TOR or Diploma).");
    if (!purpose.trim()) return alert("Please enter Purpose (required).");
    if (selectedRows.length === 0)
      return alert("Please select at least one student.");

    const payload = selectedRows.map((studentId) => ({
      studentId,
      templateId,
      type: vcTypeChoice, // "tor" | "diploma"
      purpose: purpose.trim(),
      ...(expiration ? { expiration } : {}),
      // overrides: { issuerName: ISSUER_NAME, issuerDid: ISSUER_DID },
    }));

    try {
      const result = await dispatch(createDraftsThunk(payload)).unwrap();
      const summary =
        typeof result.created === "object" && result.created
          ? `Created: ${result.created.createdCount ?? 0}, Duplicates: ${
              result.created.duplicateCount ?? 0
            }, Errors: ${result.created.errorCount ?? 0}`
          : "Drafts created.";
      alert(summary);
      clearSelection();
    } catch (err) {
      alert(
        typeof err === "string"
          ? err
          : err?.message || "Failed to create drafts."
      );
    }
  };

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 mb-0">Create Drafts</h1>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => window.history.back()}
          >
            Back
          </Button>
          <Button variant="success" onClick={createDrafts}>
            Create Drafts
          </Button>
        </div>
      </div>

      {/* 1) VC Template + VC Type + Purpose */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={6}>
              <Form.Label className="small text-muted mb-1">
                Select VC Template
              </Form.Label>
              <InputGroup>
                <Form.Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={loadingTemplates}
                >
                  {templates.length === 0 && (
                    <option value="">No templates found</option>
                  )}
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name || t.slug || t._id}
                      {t.version != null ? ` (v${t.version})` : ""}
                    </option>
                  ))}
                </Form.Select>
                {loadingTemplates && (
                  <InputGroup.Text>
                    <Spinner animation="border" size="sm" />
                  </InputGroup.Text>
                )}
              </InputGroup>
              <Form.Text className="text-muted">
                We’ll default VC Type from the template when possible. You can
                change it below.
              </Form.Text>
            </Col>

            <Col md={6}>
              <Row className="g-2">
                <Col md={6}>
                  <Form.Label className="small text-muted mb-1">
                    VC Type
                  </Form.Label>
                  <Form.Select
                    value={vcTypeChoice}
                    onChange={(e) => setVcTypeChoice(e.target.value)}
                  >
                     <option value="diploma">Diploma</option>
                    <option value="tor">TOR</option>
                   
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label className="small text-muted mb-1">
                    Purpose
                  </Form.Label>
                  <Form.Control
                    placeholder="e.g. issuance"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 2) Student Selection Table */}
      <Card className="mb-3">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <strong>Select Students for Drafts</strong>
            <div className="small text-muted">
              Selected: <Badge bg="secondary">{selectedRows.length}</Badge>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {studentsError && studentsMessage ? (
            <Alert variant="danger" className="mb-3">
              {String(studentsMessage)}
            </Alert>
          ) : null}

          {/* Search + Filter */}
          <Row className="g-2 align-items-center mb-3">
            <Col md={6}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by name, student number, or program"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Button type="submit" variant="primary">
                    Search
                  </Button>
                </InputGroup>
              </Form>
            </Col>
            <Col md={6} className="d-flex justify-content-end gap-2">
              <Form.Select
                style={{ maxWidth: 220 }}
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="All">All Programs</option>
                {programs.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="secondary"
                onClick={() => {
                  const filters = {
                    ...(selectedProgram !== "All" && {
                      programs: String(selectedProgram),
                    }),
                    ...(query && { q: query }),
                  };
                  localStorage.setItem(
                    "lastStudentFilters",
                    JSON.stringify(filters)
                  );
                  dispatch(getPassingStudents(filters));
                  setCurrentPage(1);
                }}
              >
                Apply
              </Button>
              <Button variant="outline-dark" onClick={selectAllOnPage}>
                Toggle All (page)
              </Button>
              <Button
                variant="outline-danger"
                onClick={clearSelection}
                disabled={selectedRows.length === 0}
              >
                Clear Selected
              </Button>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table bordered hover size="sm" className="align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }} />
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Address</th>
                  <th>Place of Birth</th>
                  <th>Date Admission</th>
                  <th>Date Graduated</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading students…
                    </td>
                  </tr>
                ) : currentStudents.length > 0 ? (
                  currentStudents.map((stu, idx) => {
                    const isChecked = selectedRows.includes(stu._id);
                    const dateAdmission = stu.dateAdmission
                      ? String(stu.dateAdmission).split("T")[0]
                      : "—";
                    const dateGraduated = stu.dateGraduated
                      ? String(stu.dateGraduated).split("T")[0]
                      : "—";
                    return (
                      <tr
                        key={stu._id}
                        onClick={() => toggleRow(stu._id)}
                        className={isChecked ? "table-success" : ""}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleRow(stu._id);
                            }}
                          />
                        </td>
                        <td>{indexOfFirstRow + idx + 1}</td>
                        <td>{stu.fullName || "—"}</td>
                        <td>{stu.address || "—"}</td>
                        <td>{stu.placeOfBirth || "—"}</td>
                        <td>{dateAdmission}</td>
                        <td>{dateGraduated}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          <Row className="mt-3">
            <Col className="d-flex justify-content-end">
              <nav aria-label="Page navigation">
                <ul className="pagination mb-0">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    >
                      &laquo;
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <li
                      key={i + 1}
                      className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                    >
                      <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  <li
                    className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                    >
                      &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 3) Settings / Issuer Profile */}
      <Card>
        <Card.Header className="bg-light">
          <strong>Settings</strong>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="small text-muted mb-1">Issuer Name</Form.Label>
                  <Form.Control value={ISSUER_NAME} disabled readOnly />
                </Col>
                <Col md={6}>
                  <Form.Label className="small text-muted mb-1">Issuer DID</Form.Label>
                  <Form.Control value={ISSUER_DID} disabled readOnly />
                </Col>
                <Col md={6}>
                  <Form.Label className="small text-muted mb-1">
                    Expiration (optional)
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                  />
                </Col>
              </Row>
            </Col>

            <Col md={4} className="d-flex align-items-center justify-content-end">
              <div className="text-end">
                <Form.Check
                  type="switch"
                  id="anchor-switch"
                  label="Anchor on chain"
                  checked={anchorNow}
                  onChange={(e) => setAnchorNow(e.target.checked)}
                />
                <div className="small text-muted">
                  Off by default. (Anchoring occurs after signing in your flow.)
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
        <Card.Footer className="d-flex justify-content-end gap-2">
          <Button variant="success" onClick={createDrafts}>
            Create Drafts
          </Button>
        </Card.Footer>
      </Card>
    </section>
  );
}

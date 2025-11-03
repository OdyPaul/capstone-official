// src/pages/StudentProfiles.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Badge,
  InputGroup,
  Spinner,
  Table,
  Modal,
  Alert,
} from "react-bootstrap";
import { FaSearch, FaSync, FaEye, FaUserPlus, FaCog, FaEdit, FaPlus } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import {
  getPassingStudents,
  getStudentById,
  updateStudent,
} from "../../features/student/studentSlice";

/* ============================== image compression helpers ============================== */
const BYTES_LIMIT = 300 * 1024; // ~300 KB target
const MAX_W = 720;
const MAX_H = 720;

function formatBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function drawToCanvas(imgBitmap, maxW = MAX_W, maxH = MAX_H, scale = 1) {
  const srcW = imgBitmap.width;
  const srcH = imgBitmap.height;
  const ratio = Math.min((maxW / srcW) * scale, (maxH / srcH) * scale, 1); // never upscale
  const w = Math.max(1, Math.round(srcW * ratio));
  const h = Math.max(1, Math.round(srcH * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  ctx.drawImage(imgBitmap, 0, 0, w, h);
  return canvas;
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function canvasToBlob(canvas, type = "image/jpeg", quality = 0.82) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality
    );
  });
}

/**
 * Compress image to <= maxBytes using a quality ladder and slight downscaling.
 * Returns { dataUrl, size }.
 */
async function compressImageFile(
  file,
  {
    maxBytes = BYTES_LIMIT,
    maxW = MAX_W,
    maxH = MAX_H,
    mime = "image/jpeg",
    startQuality = 0.82,
    minQuality = 0.5,
    qualityStep = 0.08,
  } = {}
) {
  // Try createImageBitmap (honors EXIF orientation in modern browsers)
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Fallback: load via <img>, normalize to blob, then create bitmap
    const dataUrl = await blobToDataUrl(file);
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        cv.getContext("2d").drawImage(img, 0, 0);
        cv.toBlob((b) => {
          if (!b) return reject(new Error("Normalization to blob failed"));
          createImageBitmap(b).then(resolve, reject);
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  let scale = 1.0;
  let quality = startQuality;
  let finalBlob = null;

  for (let pass = 0; pass < 8; pass++) {
    const canvas = drawToCanvas(bitmap, maxW, maxH, scale);

    for (let q = quality; q >= minQuality - 1e-6; q -= qualityStep) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await canvasToBlob(canvas, mime, Math.max(q, minQuality));
      if (blob.size <= maxBytes || q <= minQuality + 1e-6) {
        finalBlob = blob;
        quality = Math.max(q - qualityStep, minQuality);
        break;
      }
    }

    if (finalBlob && finalBlob.size <= maxBytes) break;
    // Not small enough — reduce dimensions and try again
    scale *= 0.85;
  }

  if (!finalBlob) {
    const tinyCanvas = drawToCanvas(bitmap, Math.min(256, maxW), Math.min(256, maxH), 1);
    finalBlob = await canvasToBlob(tinyCanvas, mime, Math.max(minQuality, 0.5));
  }

  const dataUrl = await blobToDataUrl(finalBlob);
  return { dataUrl, size: finalBlob.size };
}

/* ============================== misc helpers ============================== */
const DEFAULTS = {
  program: "All",
  gradYearMin: "2025", // client-side ≥ filter default
  q: "",
};

function toDateOnly(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

function toInputDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function normalizeGender(val) {
  const g = String(val || "").toLowerCase().trim();
  return g === "male" || g === "female" || g === "other" ? g : "other";
}

function trimOrEmpty(s) {
  return typeof s === "string" ? s.trim() : s;
}

/**
 * Build a PATCH diff from current vs baseline.
 * - Skips unchanged keys
 * - Skips empty strings (so we don't wipe fields)
 * - Normalizes gender and converts GWA to number
 * - Keeps date strings as-is (server accepts), but strips empty
 */
function buildPatch(current, baseline) {
  const patch = {};
  for (const key of Object.keys(current)) {
    if (key === "studentNumber") continue; // do not allow changing here

    let cur = current[key];
    let base = baseline?.[key];

    // normalize strings (trim)
    if (typeof cur === "string") cur = trimOrEmpty(cur);
    if (typeof base === "string") base = trimOrEmpty(base);

    // field-specific normalization
    if (key === "gender") cur = normalizeGender(cur);
    if (key === "gwa") cur = cur === "" ? undefined : Number(cur);
    if (key === "dateAdmission" || key === "dateGraduated") cur = cur || undefined;

    // do not send empties / undefined / null
    if (cur === "" || cur === undefined || cur === null) continue;

    // if equal to baseline, skip
    if (JSON.stringify(cur) === JSON.stringify(base)) continue;

    patch[key] = cur;
  }
  return patch;
}

/* ============================== component ============================== */
export default function StudentProfiles() {
  const dispatch = useDispatch();
  const {
    students,
    isLoadingList,
    isLoadingDetail,
    isUpdating,
    isError,
    message,
    student: studentDetail,
    allPrograms,
  } = useSelector((s) => s.student);
  const currentUser = useSelector((s) => s.auth.user);

  /* ---------- filters ---------- */
  const [q, setQ] = useState(DEFAULTS.q);
  const [program, setProgram] = useState(DEFAULTS.program);
  const [gradYearMin, setGradYearMin] = useState(DEFAULTS.gradYearMin);

  // Modal (pending) filters
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [programPending, setProgramPending] = useState(DEFAULTS.program);
  const [yearSelectPending, setYearSelectPending] = useState(""); // "" | "YYYY" | "custom"
  const [yearCustomPending, setYearCustomPending] = useState(""); // numeric

  // View modal
  const [showView, setShowView] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Edit modal
  const canEdit = ["superadmin", "admin", "developer"].includes(
    String(currentUser?.role || "").toLowerCase()
  );
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    studentNumber: "", // read-only in UI
    program: "",
    major: "",
    gender: "other",
    address: "",
    placeOfBirth: "",
    highSchool: "",
    honor: "",
    dateAdmission: "",
    dateGraduated: "",
    gwa: "",
    photoDataUrl: "", // data URI after compression
  });
  const initialEditRef = useRef(null);
  const [editImgPreview, setEditImgPreview] = useState("");
  const editInputRef = useRef(null);

  // Compression UI state
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoBytes, setPhotoBytes] = useState(0);

  const onPickEditImage = () => editInputRef.current?.click();
  const onEditImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/^image\//i.test(f.type)) {
      alert("Please choose an image file.");
      return;
    }

    const ok = window.confirm(`Use "${f.name}" as student photo?`);
    if (!ok) return;

    setIsCompressing(true);
    setPhotoBytes(0);
    try {
      const { dataUrl, size } = await compressImageFile(f, {
        maxBytes: BYTES_LIMIT,
        maxW: MAX_W,
        maxH: MAX_H,
        mime: "image/jpeg",
        startQuality: 0.82,
        minQuality: 0.5,
        qualityStep: 0.08,
      });

      setEditImgPreview(dataUrl);
      setEditForm((prev) => ({ ...prev, photoDataUrl: dataUrl }));
      setPhotoBytes(size);

      if (size > BYTES_LIMIT) {
        alert(
          `Heads up: compressed image is still ${formatBytes(size)}. ` +
            `Consider choosing a smaller image.`
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process image. Please try a different file.");
    } finally {
      setIsCompressing(false);
      if (e.target) e.target.value = ""; // allow re-picking the same file
    }
  };

  /* ---------- derived & persistence ---------- */
  const currentYear = new Date().getFullYear();
  const quickYears = useMemo(
    () => Array.from({ length: 6 }, (_, i) => String(currentYear - i)),
    [currentYear]
  );

  const programOptions = useMemo(() => {
    const fromSlice = Array.from(new Set((allPrograms || []).filter(Boolean))).sort();
    if (fromSlice.length) return ["All", ...fromSlice];
    const fromStudents = Array.from(
      new Set((students || []).map((s) => s.program).filter(Boolean))
    ).sort();
    return ["All", ...fromStudents];
  }, [allPrograms, students]);

  // Initial load: restore filters and fetch
  useEffect(() => {
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem("lastStudentFilters")) || {};
      } catch {
        return {};
      }
    })();

    const initQ = typeof saved.q === "string" ? saved.q : DEFAULTS.q;
    const initProgram =
      typeof saved.programs === "string" ? saved.programs : DEFAULTS.program;
    const initGradMin =
      typeof saved.gradYearMin === "string" || typeof saved.gradYearMin === "number"
        ? String(saved.gradYearMin)
        : DEFAULTS.gradYearMin;

    setQ(initQ);
    setProgram(initProgram);
    setGradYearMin(initGradMin);

    // mirror to modal state
    setProgramPending(initProgram);
    if (initGradMin) {
      if (quickYears.includes(initGradMin)) {
        setYearSelectPending(initGradMin);
        setYearCustomPending("");
      } else {
        setYearSelectPending("custom");
        setYearCustomPending(initGradMin);
      }
    } else {
      setYearSelectPending("");
      setYearCustomPending("");
    }

    const serverFilters = {
      ...(initQ ? { q: initQ } : {}),
      ...(initProgram && initProgram !== "All" ? { programs: initProgram } : {}),
    };
    dispatch(getPassingStudents(serverFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, quickYears]);

  const buildServerFilters = useCallback(
    (programValue, qValue) => ({
      ...(qValue ? { q: qValue } : {}),
      ...(programValue && programValue !== "All" ? { programs: programValue } : {}),
    }),
    []
  );

  const persistFilters = useCallback((serverFilters, gradMinVal) => {
    const toSave = {
      ...serverFilters,
      ...(gradMinVal ? { gradYearMin: gradMinVal } : {}),
    };
    try {
      localStorage.setItem("lastStudentFilters", JSON.stringify(toSave));
    } catch {}
  }, []);

  /* ---------- actions/handlers ---------- */
  const applyToolbar = useCallback(() => {
    const serverFilters = buildServerFilters(program, q);
    persistFilters(serverFilters, gradYearMin);
    dispatch(getPassingStudents(serverFilters));
  }, [buildServerFilters, dispatch, program, q, gradYearMin, persistFilters]);

  const resetAll = useCallback(() => {
    setQ(DEFAULTS.q);
    setProgram(DEFAULTS.program);
    setGradYearMin(DEFAULTS.gradYearMin);

    setProgramPending(DEFAULTS.program);
    setYearSelectPending(DEFAULTS.gradYearMin);
    setYearCustomPending("");

    const serverFilters = buildServerFilters(DEFAULTS.program, DEFAULTS.q);
    persistFilters(serverFilters, DEFAULTS.gradYearMin);
    dispatch(getPassingStudents(serverFilters));
  }, [buildServerFilters, dispatch, persistFilters]);

  const applyModalFilters = useCallback(() => {
    let resolvedYear = "";
    if (yearSelectPending === "custom") {
      const n = parseInt(yearCustomPending, 10);
      if (!Number.isNaN(n)) resolvedYear = String(n);
    } else if (yearSelectPending) {
      resolvedYear = String(parseInt(yearSelectPending, 10));
    }

    setProgram(programPending);
    setGradYearMin(resolvedYear || "");

    const serverFilters = buildServerFilters(programPending, q);
    persistFilters(serverFilters, resolvedYear || "");
    dispatch(getPassingStudents(serverFilters));
    setShowFilterSettings(false);
  }, [
    buildServerFilters,
    programPending,
    yearSelectPending,
    yearCustomPending,
    q,
    dispatch,
    persistFilters,
  ]);

  /* ---------- client-side filter ---------- */
  const filtered = useMemo(() => {
    let list = students || [];

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((s) => {
        const hay = `${s.fullName || ""} ${s.studentNumber || ""} ${s.program || ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    if (gradYearMin) {
      const min = parseInt(gradYearMin, 10);
      if (!Number.isNaN(min)) {
        list = list.filter((s) => {
          if (!s?.dateGraduated) return false;
          const y = new Date(s.dateGraduated).getFullYear();
          return y >= min;
        });
      }
    }

    return list;
  }, [students, q, gradYearMin]);

  /* ---------- view modal ---------- */
  const openView = (id) => {
    setSelectedId(id);
    setShowView(true);
    dispatch(getStudentById(id));
  };
  const closeView = () => {
    setShowView(false);
    setSelectedId(null);
  };

  /* ---------- edit modal ---------- */
  const openEdit = (row) => {
    if (!canEdit) {
      alert("You don't have permission to edit students.");
      return;
    }
    const seed = {
      fullName: row.fullName || "",
      studentNumber: row.studentNumber || "",
      program: row.program || "",
      major: row.major || "",
      gender: normalizeGender(row.gender || "other"),
      address: row.address || "",
      placeOfBirth: row.placeOfBirth || "",
      highSchool: row.highSchool || "",
      honor: row.honor || "",
      dateAdmission: toInputDate(row.dateAdmission) || "",
      dateGraduated: toInputDate(row.dateGraduated) || "",
      gwa: (row.gwa ?? "") === "" ? "" : String(row.gwa),
      photoDataUrl: "",
    };
    setSelectedId(row._id);
    setEditForm(seed);
    setEditImgPreview(row.photoUrl || "");
    initialEditRef.current = seed;
    setShowEdit(true);

    dispatch(getStudentById(row._id)); // fetch latest details
  };

  // Merge latest details into the form; if the user hasn't edited yet, also update baseline
  useEffect(() => {
    if (!showEdit || !studentDetail || !selectedId || studentDetail._id !== selectedId) return;

    const merged = {
      fullName: studentDetail.fullName || "",
      studentNumber: studentDetail.studentNumber || "",
      program: studentDetail.program || "",
      major: studentDetail.major || "",
      gender: normalizeGender(studentDetail.gender || "other"),
      address: studentDetail.address || "",
      placeOfBirth: studentDetail.placeOfBirth || "",
      highSchool: studentDetail.highSchool || "",
      honor: studentDetail.honor || "",
      dateAdmission: toInputDate(studentDetail.dateAdmission) || "",
      dateGraduated: toInputDate(studentDetail.dateGraduated) || "",
      gwa: (studentDetail.gwa ?? "") === "" ? "" : String(studentDetail.gwa),
      photoDataUrl: "",
    };

    // Check if user already changed something; if not, update baseline too
    const unsaved =
      JSON.stringify(editForm) !== JSON.stringify(initialEditRef.current || {});
    setEditForm((prev) => ({ ...prev, ...merged }));
    if (!unsaved) {
      initialEditRef.current = { ...(initialEditRef.current || {}), ...merged };
    }

    if (studentDetail.photoUrl) setEditImgPreview(studentDetail.photoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentDetail, showEdit, selectedId]);

  const hasUnsaved = () =>
    JSON.stringify(editForm) !== JSON.stringify(initialEditRef.current || {});

  const tryCloseEdit = () => {
    if (hasUnsaved()) {
      const ok = window.confirm("You have unsaved changes. Discard them?");
      if (!ok) return;
    }
    setShowEdit(false);
    setSelectedId(null);
  };

  const submitEdit = async () => {
    if (!selectedId) return;
    if (isCompressing) {
      alert("Please wait for image compression to finish.");
      return;
    }

    const patch = buildPatch(editForm, initialEditRef.current);

    if (!Object.keys(patch).length) {
      alert("Nothing to update.");
      return;
    }

    try {
      await dispatch(updateStudent({ id: selectedId, data: patch })).unwrap();
      setShowEdit(false);
      setSelectedId(null);
      dispatch(getPassingStudents(buildServerFilters(program, q)));
    } catch (err) {
      alert(err || "Failed to update student");
    }
  };

  /* ============================== UI ============================== */
  return (
    <section className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <h1 className="h4 mb-0">Student Profiles</h1>
          <Badge bg="secondary" className="ms-1">Passing ≤ 3.0</Badge>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={() => dispatch(getPassingStudents(buildServerFilters(program, q)))}
          >
            <FaSync className="me-2" />
            Refresh
          </Button>
          <Button
            as={NavLink}
            to="/students/create-student"
            end
            variant="warning"
            className="d-flex align-items-center"
            style={{ textDecoration: "none" }}
          >
            <FaUserPlus className="me-2" />
            Create Student
            <span className="ms-2 badge bg-dark">TEST</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="mb-3">
        <Card.Body className="pb-2">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              applyToolbar();
            }}
          >
            <InputGroup className="flex-nowrap">
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control
                placeholder="Search by name, student no., or program…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button type="submit" variant="primary">Apply</Button>
              <Button type="button" variant="outline-secondary" onClick={resetAll}>
                Reset
              </Button>
              <Button
                type="button"
                variant="outline-dark"
                title="Filter settings"
                onClick={() => setShowFilterSettings(true)}
              >
                <FaCog />
              </Button>
            </InputGroup>
          </Form>

          <div className="mt-2 d-flex flex-wrap gap-2">
            {q ? <Badge bg="light" text="dark">q: {q}</Badge> : null}
            {program && program !== "All" ? (
              <Badge bg="light" text="dark">Program: {program}</Badge>
            ) : (
              <Badge bg="light" text="dark">Program: All</Badge>
            )}
            {gradYearMin ? (
              <Badge bg="light" text="dark">Grad ≥ {gradYearMin}</Badge>
            ) : (
              <Badge bg="light" text="dark">Grad: Any</Badge>
            )}
            <Badge bg="secondary">Rows: {filtered.length}</Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Errors */}
      {isError && message ? <Alert variant="danger">{String(message)}</Alert> : null}

      {/* Table */}
      <Card>
        <Card.Header className="bg-light"><strong>Students</strong></Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Photo</th>
                  <th>Full Name</th>
                  <th>Student No.</th>
                  <th>Program</th>
                  <th>GWA</th>
                  <th>Date Graduated</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((s) => (
                    <tr key={s._id}>
                      <td>
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt=""
                            style={{ width: 42, height: 42, objectFit: "cover", borderRadius: 6 }}
                          />
                        ) : (
                          <div className="text-muted small">—</div>
                        )}
                      </td>
                      <td>{s.fullName || "—"}</td>
                      <td>{s.studentNumber || "—"}</td>
                      <td>{s.program || "—"}</td>
                      <td>{s.gwa !== undefined && s.gwa !== null ? s.gwa : "—"}</td>
                      <td>{toDateOnly(s.dateGraduated)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            title="View"
                            onClick={() => openView(s._id)}
                          >
                            <FaEye />
                          </Button>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              title="Edit"
                              onClick={() => openEdit(s)}
                            >
                              <FaEdit />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">No students found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* View Student Modal */}
      <Modal show={showView} onHide={closeView} centered size="lg">
        <Modal.Header closeButton><Modal.Title>View Student</Modal.Title></Modal.Header>
        <Modal.Body>
          {isLoadingDetail ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : !studentDetail ? (
            <div className="text-muted">No data.</div>
          ) : (
            <Row>
              <Col md={8}>
                <Row className="mb-3">
                  <Col md={8}>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control value={studentDetail.fullName || ""} disabled readOnly />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Student No.</Form.Label>
                    <Form.Control value={studentDetail.studentNumber || ""} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Program</Form.Label>
                    <Form.Control value={studentDetail.program || ""} disabled readOnly />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Major</Form.Label>
                    <Form.Control value={studentDetail.major || ""} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Curriculum</Form.Label>
                    <Form.Control
                      value={
                        // protect against [object Object]
                        typeof studentDetail.curriculum === "string"
                          ? studentDetail.curriculum
                          : studentDetail.curriculum?._id || ""
                      }
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Control value={studentDetail.gender || ""} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Label>Address</Form.Label>
                    <Form.Control as="textarea" rows={2} value={studentDetail.address || ""} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Place of Birth</Form.Label>
                    <Form.Control value={studentDetail.placeOfBirth || ""} disabled readOnly />
                  </Col>
                  <Col md={6}>
                    <Form.Label>High School</Form.Label>
                    <Form.Control value={studentDetail.highSchool || ""} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Date Admission</Form.Label>
                    <Form.Control value={toDateOnly(studentDetail.dateAdmission)} disabled readOnly />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Date Graduated</Form.Label>
                    <Form.Control value={toDateOnly(studentDetail.dateGraduated)} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>GWA</Form.Label>
                    <Form.Control
                      value={
                        studentDetail.gwa !== undefined && studentDetail.gwa !== null
                          ? studentDetail.gwa
                          : ""
                      }
                      disabled readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Honor</Form.Label>
                    <Form.Control value={studentDetail.honor || ""} disabled readOnly />
                  </Col>
                </Row>
              </Col>

              <Col md={4}>
                <div className="border rounded d-flex flex-column align-items-center justify-content-center p-3" style={{ minHeight: 260 }}>
                  {studentDetail.photoUrl ? (
                    <img
                      src={studentDetail.photoUrl}
                      alt="Profile"
                      style={{ width: 180, height: 180, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
                    />
                  ) : (
                    <div className="text-muted">No profile photo</div>
                  )}
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeView}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Student Modal */}
      <Modal show={showEdit} onHide={tryCloseEdit} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Edit Student</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              submitEdit();
            }}
          >
            <Row>
              <Col md={8}>
                <Row className="mb-3">
                  <Col md={8}>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      required
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Student No.</Form.Label>
                    <Form.Control value={editForm.studentNumber} disabled readOnly />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Program</Form.Label>
                    <Form.Control
                      value={editForm.program}
                      onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                      placeholder="e.g., BSIT"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Major</Form.Label>
                    <Form.Control
                      value={editForm.major}
                      onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                      placeholder="optional"
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    >
                      <option value="male">male</option>
                      <option value="female">female</option>
                      <option value="other">other</option>
                    </Form.Select>
                  </Col>
                  <Col md={6}>
                    <Form.Label>Honor</Form.Label>
                    <Form.Control
                      value={editForm.honor}
                      onChange={(e) => setEditForm({ ...editForm, honor: e.target.value })}
                      placeholder="e.g., Cum Laude"
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Place of Birth</Form.Label>
                    <Form.Control
                      value={editForm.placeOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, placeOfBirth: e.target.value })}
                      placeholder="City, Province"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>High School</Form.Label>
                    <Form.Control
                      value={editForm.highSchool}
                      onChange={(e) => setEditForm({ ...editForm, highSchool: e.target.value })}
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Date Admission</Form.Label>
                    <Form.Control
                      type="date"
                      value={editForm.dateAdmission}
                      onChange={(e) => setEditForm({ ...editForm, dateAdmission: e.target.value })}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Date Graduated</Form.Label>
                    <Form.Control
                      type="date"
                      value={editForm.dateGraduated}
                      onChange={(e) => setEditForm({ ...editForm, dateGraduated: e.target.value })}
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>GWA</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="1.00"
                      max="5.00"
                      value={editForm.gwa}
                      onChange={(e) => setEditForm({ ...editForm, gwa: e.target.value })}
                      placeholder="e.g., 2.25"
                    />
                  </Col>
                </Row>
              </Col>

              <Col md={4}>
                <div
                  className="border rounded d-flex flex-column align-items-center justify-content-center p-3"
                  style={{ minHeight: 260 }}
                >
                  {editImgPreview ? (
                    <>
                      <img
                        src={editImgPreview}
                        alt="Photo"
                        style={{
                          width: 180,
                          height: 180,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #eee",
                        }}
                      />
                      <div className="small text-muted mt-2">
                        {isCompressing ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Compressing…
                          </>
                        ) : photoBytes ? (
                          <>Size: {formatBytes(photoBytes)} (≤ {formatBytes(BYTES_LIMIT)} target)</>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="mt-2"
                        onClick={onPickEditImage}
                        title="Change photo"
                        disabled={isCompressing}
                      >
                        <FaEdit className="me-2" /> Change
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-muted mb-3">No photo</div>
                      <Button
                        type="button"
                        variant="outline-dark"
                        onClick={onPickEditImage}
                        disabled={isCompressing}
                      >
                        <FaPlus className="me-2" /> Add Photo
                      </Button>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={editInputRef}
                    style={{ display: "none" }}
                    onChange={onEditImageChange}
                  />
                </div>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={tryCloseEdit}>Cancel</Button>
          <Button variant="primary" onClick={submitEdit} disabled={isUpdating || isCompressing}>
            {isUpdating || isCompressing ? <Spinner animation="border" size="sm" className="me-2" /> : null}
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Filter settings modal */}
      <Modal show={showFilterSettings} onHide={() => setShowFilterSettings(false)} centered>
        <Modal.Header closeButton><Modal.Title>Student Filters</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <div>
              <Form.Label>Program</Form.Label>
              <Form.Select value={programPending} onChange={(e) => setProgramPending(e.target.value)}>
                {programOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Programs are derived from currently loaded data.</Form.Text>
            </div>

            <div>
              <Form.Label>Graduation Year (≥)</Form.Label>
              <Form.Select value={yearSelectPending} onChange={(e) => setYearSelectPending(e.target.value)}>
                <option value="">(Any year)</option>
                <optgroup label="Presets">
                  {quickYears.map((y) => (
                    <option key={`q-${y}`} value={y}>{y}</option>
                  ))}
                </optgroup>
                <optgroup label="Custom">
                  <option value="custom">Type a year…</option>
                </optgroup>
              </Form.Select>

              {yearSelectPending === "custom" && (
                <div className="mt-2">
                  <Form.Control
                    type="number"
                    inputMode="numeric"
                    min="1900"
                    max="2100"
                    placeholder="Type year, e.g. 2025"
                    value={yearCustomPending}
                    onChange={(e) => setYearCustomPending(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <Form.Text className="text-muted">
                    Students who graduated in this year or later will be shown.
                  </Form.Text>
                </div>
              )}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" type="button" onClick={() => setShowFilterSettings(false)}>
            Close
          </Button>
          <Button variant="primary" type="button" onClick={applyModalFilters}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

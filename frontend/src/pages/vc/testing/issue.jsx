// src/pages/IssueCredentials.jsx
import React, { useCallback, useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Table,
  Spinner,
  Alert,
  Modal,
  Badge,
} from "react-bootstrap";
import { NavLink } from "react-router-dom";
import {
  FaArrowLeft,
  FaCog,
  FaEye,
  FaTrash,
  FaEdit,
  FaCheckCircle,
  FaSearch,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { API_URL } from "../../../../config";
import { issueCredentials as issueCredentialsThunk } from "../../../features/issuance/issueSlice";
import { getPassingStudents, getStudentTor, getStudentById } from "../../../features/student/studentSlice";

/* ----------------------------- helpers ----------------------------- */
const normalizeType = (value = "") => {
  const v = String(value).toLowerCase();
  if (v.includes("tor")) return "tor";
  if (v.includes("diploma")) return "diploma";
  return "";
};

// UTC-safe YYYY-MM-DD
const ymdUTC = (d) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);

const addMonths = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return ymdUTC(d);
};

// Date-only renderer
const toDateOnly = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

// Normalize purpose
const normalizePurpose = (v = "") => String(v).trim().toLowerCase();

const PURPOSE_OPTIONS = [
  { value: "employment", label: "Employment" },
  { value: "further studies", label: "Further Studies" },
  {
    value: "board examination / professional licensure",
    label: "Board Examination / Professional Licensure",
  },
  {
    value: "scholarship / grant application",
    label: "Scholarship / Grant Application",
  },
  {
    value: "personal / general reference",
    label: "Personal / General Reference",
  },
  { value: "overseas employment", label: "Overseas Employment" },
  { value: "training / seminar", label: "Training / Seminar" },
];

/* ---------------------- small modal components --------------------- */

function ImportSpreadsheetModal({
  show,
  onHide,
  onImported,
  preview,
  setPreview,
}) {
  const [isParsingStudents, setIsParsingStudents] = useState(false);
  const [isParsingGrades, setIsParsingGrades] = useState(false);
  const [error, setError] = useState("");
  const [seedToDbLocal, setSeedToDbLocal] = useState(
    preview.shouldSeedDb || false
  );

  const [localStudents, setLocalStudents] = useState([]);
  const [localGrades, setLocalGrades] = useState([]);

  const isParsing = isParsingStudents || isParsingGrades;

  // ---- mappers -----------------------------------------------------

    const mapStudentRows = (rawStudents) =>
    rawStudents.map((row) => {
      const studentNumber =
        String(
          row.StudentNo ||
            row.studentNumber ||
            row.STUDENT_NO ||
            row["Student No"] ||
            ""
        ).trim();

      const gradRaw =
        row.DateGraduated ||
        row["Date Graduated"] ||
        row.dateGraduated ||
        "";
      let gradDate = "";
      if (gradRaw) {
        const d = new Date(gradRaw);
        if (!Number.isNaN(d.getTime())) gradDate = ymdUTC(d);
      }

      const admitRaw =
        row.DateAdmitted || row["Date Admitted"] || row.dateAdmitted || "";
      let admitDate = "";
      if (admitRaw) {
        const d = new Date(admitRaw);
        if (!Number.isNaN(d.getTime())) admitDate = ymdUTC(d);
      }

      // ✅ NEW: parse Date of Birth
      const dobRaw =
        row.DateOfBirth ||
        row["Date Of Birth"] ||
        row["Date of Birth"] ||
        row.dateOfBirth ||
        "";
      let dateOfBirth = "";
      if (dobRaw) {
        const d = new Date(dobRaw);
        if (!Number.isNaN(d.getTime())) dateOfBirth = ymdUTC(d);
      }

      return {
        studentNumber,
        lastName: row.LastName || row.lastName || "",
        firstName: row.FirstName || row.firstName || "",
        middleName: row.MiddleName || row.middleName || "",
        extName: row.ExtName || row.extName || "",
        gender: row.Gender || row.gender || "",
        permanentAddress:
          row.Perm_Address || row.permanentAddress || row.Address || "",
        major: row.Major || row.major || "",
        curriculumCode: row.CurriculumID || row.curriculumCode || "",
        collegeGwa:
          row.College_Gwa !== undefined && row.College_Gwa !== ""
            ? Number(row.College_Gwa)
            : null,
        dateAdmitted: admitDate,
        dateGraduated: gradDate,
        placeOfBirth: row.PlaceOfBirth || "",
        dateOfBirth,
        collegeAwardHonor: row.College_AwardHonor || "",
        entranceCredentials:
          row.EntranceData_AdmissionCredential ||
          row.EntranceCredential ||
          "",
        jhsSchool: row.JHS_School || "",
        shsSchool: row.SHS_School || "",
        program: row.Program || row.program || "",
        photoUrl: row.PhotoUrl || row.photoUrl || "",
        email: row.Email || row.email || "",
      };
    });


  const mapGradeRows = (rawGrades) =>
    rawGrades.map((row) => {
      const studentNumber =
        String(
          row.StudentNo ||
            row.studentNumber ||
            row.STUDENT_NO ||
            row["Student No"] ||
            ""
        ).trim();

      return {
        studentNumber,
        curriculumCode: row.CurriculumID || row.curriculumCode || "",
        yearLevel: row.YearLevel || row.yearLevel || "",
        semester: row.Semester || row.semester || "",
        subjectCode: row.SubjectCode || row.subjectCode || "",
        subjectTitle: row.SubjectTitle || row.subjectTitle || "",
        units:
          row.Units !== undefined && row.Units !== ""
            ? Number(row.Units)
            : null,
        schoolYear: row.SchoolYear || row.schoolYear || "",
        termName: row.TermName || row.termName || "",
        finalGrade:
          row.FinalGrade !== undefined && row.FinalGrade !== ""
            ? Number(row.FinalGrade)
            : null,
        remarks: row.Remarks || row.remarks || "",
      };
    });

  // random grades if no grades sheet uploaded
  const seedRandomGrades = (students) => {
    const seeded = [];
    const years = ["1St Year", "2Nd Year", "3Rd Year", "4Th Year"];
    const sems = ["1St Semester", "2Nd Semester"];

    students.forEach((stu, idx) => {
      for (let i = 1; i <= 3; i += 1) {
        const year = years[idx % years.length];
        const sem = sems[i % sems.length];
        const finalGrade = parseFloat((1 + Math.random() * 2).toFixed(2)); // 1.00–3.00

        seeded.push({
          studentNumber: stu.studentNumber,
          curriculumCode: stu.curriculumCode || "",
          yearLevel: year,
          semester: sem,
          subjectCode: `SUBJ${i.toString().padStart(3, "0")}`,
          subjectTitle: `Subject ${i}`,
          units: 3,
          schoolYear: "",
          termName: "",
          finalGrade,
          remarks: "PASSED",
        });
      }
    });

    return seeded;
  };

  const recomputePreview = (students, grades) => {
    const studentRows = students || [];
    let gradeRows = grades || [];

    if (!gradeRows.length && studentRows.length) {
      gradeRows = seedRandomGrades(studentRows);
    }

    const recipients = studentRows.map((stu) => {
      const fullName = `${stu.lastName || ""}, ${stu.firstName || ""}${
        stu.middleName ? " " + stu.middleName : ""
      }`.trim();

      return {
        tempId: `${stu.studentNumber || Math.random().toString(36).slice(2)}`,
        studentNumber: stu.studentNumber,
        fullName: fullName || stu.studentNumber || "—",
        dateGraduated: stu.dateGraduated || "",
        program: stu.program || "",
        studentData: stu,
        grades: gradeRows.filter((g) => g.studentNumber === stu.studentNumber),
        isEditing: false,
      };
    });

    setLocalStudents(studentRows);
    setLocalGrades(gradeRows);
    setPreview((prev) => ({
      ...prev,
      studentRows,
      gradeRows,
      recipients,
    }));
  };

  // ---- file handlers ------------------------------------------------

  const handleStudentFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingStudents(true);
    setError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      const studentSheet =
        workbook.Sheets["student_data"] ||
        workbook.Sheets["Student_Data"] ||
        workbook.Sheets["STUDENT_DATA"] ||
        workbook.Sheets[workbook.SheetNames[0]];

      const rawStudents = studentSheet
        ? XLSX.utils.sheet_to_json(studentSheet, { defval: "" })
        : [];

      const studentRows = mapStudentRows(rawStudents);
      recomputePreview(studentRows, localGrades);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse student data file.");
      setPreview({
        studentRows: [],
        gradeRows: [],
        recipients: [],
        shouldSeedDb: false,
      });
    } finally {
      setIsParsingStudents(false);
    }
  };

  const handleGradesFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingGrades(true);
    setError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      const gradeSheet =
        workbook.Sheets["grades"] ||
        workbook.Sheets["Grades"] ||
        workbook.Sheets["GRADES"] ||
        workbook.Sheets[workbook.SheetNames[0]];

      const rawGrades = gradeSheet
        ? XLSX.utils.sheet_to_json(gradeSheet, { defval: "" })
        : [];

      const gradeRows = mapGradeRows(rawGrades);
      recomputePreview(localStudents, gradeRows);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse grades file.");
      setPreview({
        studentRows: [],
        gradeRows: [],
        recipients: [],
        shouldSeedDb: false,
      });
    } finally {
      setIsParsingGrades(false);
    }
  };

  const handleConfirm = () => {
    if (!preview.recipients.length) {
      setError("No students detected from spreadsheet(s).");
      return;
    }
    onImported({ ...preview, shouldSeedDb: seedToDbLocal });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Import Spreadsheet</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Student data file (required)</Form.Label>
          <Form.Control
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleStudentFileChange}
            disabled={isParsing}
          />
          <Form.Text className="text-muted">
            Columns like <code>StudentNo</code>, <code>LastName</code>,{" "}
            <code>FirstName</code>, <code>DateGraduated</code>,{" "}
            <code>Program</code>, etc.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Grades file (optional)</Form.Label>
          <Form.Control
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleGradesFileChange}
            disabled={isParsing}
          />
        </Form.Group>

        {isParsing && (
          <div className="text-center my-3">
            <Spinner animation="border" className="me-2" />
            Parsing spreadsheet…
          </div>
        )}

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {preview.recipients.length > 0 && !isParsing && (
          <>
            <div className="d-flex flex-wrap gap-2 mb-2">
              <Badge bg="primary">
                Students: {preview.studentRows.length || 0}
              </Badge>
              <Badge bg="info">
                Grade rows: {preview.gradeRows.length || 0}
              </Badge>
              <Badge bg="success">
                Recipients: {preview.recipients.length || 0}
              </Badge>
            </div>

            <div className="table-responsive">
              <Table size="sm" bordered className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Student No.</th>
                    <th>Full Name</th>
                    <th>Program</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.recipients.slice(0, 5).map((r, i) => (
                    <tr key={r.tempId}>
                      <td>{i + 1}</td>
                      <td>{r.studentNumber || "—"}</td>
                      <td>{r.fullName || "—"}</td>
                      <td>{r.program || "—"}</td>
                    </tr>
                  ))}
                  {preview.recipients.length > 5 && (
                    <tr>
                      <td colSpan={4} className="text-muted small">
                        …and {preview.recipients.length - 5} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            <Form.Check
              type="switch"
              id="seed-db-switch"
              className="mt-3"
              label="Also send student & grade rows so the backend can upsert them into the database."
              checked={seedToDbLocal}
              onChange={(e) => setSeedToDbLocal(e.target.checked)}
            />
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isParsing || !preview.recipients.length}
        >
          Use These Students
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function IssueProgressModal({ show, total, current }) {
  const pct = total ? Math.round((current / total) * 100) : 0;

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Body>
        <div className="d-flex align-items-center mb-3">
          <Spinner animation="border" className="me-3" />
          <div>
            <div className="fw-semibold">Issuing credentials…</div>
            <div className="text-muted small">
              Please don&apos;t close this window.
            </div>
          </div>
        </div>
        <div className="progress mb-2">
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${pct}%` }}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="text-end small text-muted">
          {current} out of {total || 0}
        </div>
      </Modal.Body>
    </Modal>
  );
}

function ConfirmIssueModal({ show, count, vcTypeLabel, onClose }) {
  return (
    <Modal show={show} onHide={() => onClose(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Issuance</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">
          You are about to issue <strong>{count}</strong> {vcTypeLabel}{" "}
          credential{count === 1 ? "" : "s"}.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button variant="success" onClick={() => onClose(true)}>
          Issue Credentials
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function IssueSuccessModal({ show, stats, onClose }) {
  const { created = 0, duplicates = 0, errors = 0, totalRequested = 0 } =
    stats || {};

  const heading =
    created > 0
      ? `Issued ${created} Verifiable Credential${created === 1 ? "" : "s"}!`
      : "Issuance completed";

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Body className="text-center py-4">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{ width: 64, height: 64, backgroundColor: "#e8f9f0" }}
        >
          <FaCheckCircle size={32} />
        </div>

        <h5 className="mb-2">{heading}</h5>

        <p className="text-muted small mb-1">
          Requested: <strong>{totalRequested}</strong>
        </p>
        <p className="text-muted small mb-0">
          New credentials: <strong>{created}</strong>
          {duplicates ? (
            <>
              {" · "}Already issued: <strong>{duplicates}</strong>
            </>
          ) : null}
          {errors ? (
            <>
              {" · "}Failed: <strong>{errors}</strong>
            </>
          ) : null}
        </p>
        <p className="text-muted small mt-2 mb-0">
          You can now view them in your issues list / cashier view.
        </p>
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="success" onClick={onClose}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// 🔎 Student details (with on-demand TOR loading for DB students)
function RecipientDetailsModal({ show, onHide, recipient }) {
  const dispatch = useDispatch();
  const { tor, isLoadingTor, isError, message, student: studentDetail } =
    useSelector((s) => s.student || {});
  const [tab, setTab] = useState("student");

  useEffect(() => {
    if (show) setTab("student");
  }, [show, recipient]);

  // When opened for a DB student without preloaded grades, fetch TOR
  useEffect(() => {
    if (!show || !recipient) return;

    const hasSpreadsheetGrades =
      Array.isArray(recipient.grades) && recipient.grades.length > 0;
    const studentId = recipient.studentData?._id;

    if (!hasSpreadsheetGrades && studentId) {
      dispatch(getStudentTor(studentId));
    }
  }, [show, recipient, dispatch]);

  // fetch FULL student detail when needed (names, dateAdmission, etc.)
  useEffect(() => {
    if (!show || !recipient) return;
    const studentId = recipient.studentData?._id;
    if (studentId) dispatch(getStudentById(studentId));
  }, [show, recipient, dispatch]);

  if (!recipient) return null;

  // prefer fresh detail from store (must match the id of this recipient)
  const s =
    studentDetail &&
    recipient.studentData &&
    studentDetail._id === recipient.studentData._id
      ? studentDetail
      : recipient.studentData || {};
  const grades =
    recipient.grades && recipient.grades.length ? recipient.grades : tor || [];

  const fullName =
    recipient.fullName ||
    `${s.lastName || ""}, ${s.firstName || ""}${
      s.middleName ? " " + s.middleName : ""
    }`.trim();

  return (
    <Modal show={show} onHide={onHide} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Student details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div className="fw-semibold">{fullName || "—"}</div>
            <div className="text-muted small">
              {recipient.studentNumber || "—"} · {recipient.program || "—"}
            </div>
          </div>
          <div className="btn-group">
            <Button
              size="sm"
              variant={tab === "student" ? "primary" : "outline-primary"}
              onClick={() => setTab("student")}
            >
              Student Data
            </Button>
            <Button
              size="sm"
              variant={tab === "grades" ? "primary" : "outline-primary"}
              onClick={() => setTab("grades")}
            >
              Grades
            </Button>
          </div>
        </div>

        {tab === "student" ? (
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Student No.</Form.Label>
              <Form.Control value={recipient.studentNumber || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>Program</Form.Label>
              <Form.Control value={recipient.program || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>Last name</Form.Label>
              <Form.Control value={s.lastName || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>First name</Form.Label>
              <Form.Control value={s.firstName || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>Middle name</Form.Label>
              <Form.Control value={s.middleName || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>Ext. name</Form.Label>
              <Form.Control value={s.extName || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>Date admitted</Form.Label>
              <Form.Control value={s.dateAdmission || s.dateAdmitted || ""} readOnly />
            </Col>
             <Col md={6}>
              <Form.Label>Date admitted</Form.Label>
              <Form.Control
                value={s.dateAdmission || s.dateAdmitted || ""}
                readOnly
              />
            </Col>
            <Col md={6}>
              <Form.Label>Date graduated</Form.Label>
              <Form.Control
                value={recipient.dateGraduated || s.dateGraduated || ""}
                readOnly
              />
            </Col>
         
            <Col md={6}>
              <Form.Label>Date of birth</Form.Label>
              <Form.Control
                value={toDateOnly(s.dateOfBirth || "")}
                readOnly  
              />
            </Col>

            <Col md={6}>
              <Form.Label>Major</Form.Label>
              <Form.Control value={s.major || ""} readOnly />
            </Col>
            <Col md={6}>
              <Form.Label>GWA</Form.Label>
              <Form.Control
                value={
                  s.collegeGwa !== undefined && s.collegeGwa !== null
                    ? s.collegeGwa
                    : ""
                }
                readOnly
              />
            </Col>
            <Col md={12}>
              <Form.Label>Permanent address</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={s.permanentAddress || ""}
                readOnly
              />
            </Col>
          </Row>
        ) : (
          <div
            className="table-responsive"
            style={{ maxHeight: "450px", overflowY: "auto" }}
          >
            <Table bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Year level</th>
                  <th>Semester</th>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Units</th>
                  <th>Final grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTor && !grades.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-3">
                      <Spinner animation="border" className="me-2" />
                      Loading grades…
                    </td>
                  </tr>
                ) : grades.length ? (
                  grades.map((g, i) => (
                    <tr key={`${g.subjectCode || i}-${i}`}>
                      <td>{g.yearLevel || "—"}</td>
                      <td>{g.semester || "—"}</td>
                      <td>{g.subjectCode || "—"}</td>
                      <td>{g.subjectTitle || g.subjectDescription || "—"}</td>
                      <td>{g.units != null ? g.units : "—"}</td>
                      <td>{g.finalGrade != null ? g.finalGrade : "—"}</td>
                      <td>{g.remarks || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      {isError && message
                        ? String(message)
                        : "No grade rows for this student (grades are pulled on the backend when issuing TOR)."}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ---------------------- Add-from-DB modal ---------------------- */

function AddFromRegistryModal({ show, onHide, onAdd }) {
  const dispatch = useDispatch();
  const {
    students,
    isLoadingList: loadingStudents,
    isError,
    message,
    allPrograms,
  } = useSelector((s) => s.student || {});

  const [q, setQ] = useState("");
  const [program, setProgram] = useState("All");
  const [gradYearMin, setGradYearMin] = useState("");

  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [programPending, setProgramPending] = useState("All");
  const [yearSelectPending, setYearSelectPending] = useState("");
  const [yearCustomPending, setYearCustomPending] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const currentYear = new Date().getFullYear();
  const quickYears = useMemo(
    () => Array.from({ length: 6 }, (_, i) => String(currentYear - i)),
    [currentYear]
  );

  const programOptions = useMemo(() => {
    const fromSlice = Array.from(
      new Set((allPrograms || []).filter(Boolean))
    ).sort();
    if (fromSlice.length) return ["All", ...fromSlice];
    const fromStudents = Array.from(
      new Set((students || []).map((s) => s.program).filter(Boolean))
    ).sort();
    return ["All", ...fromStudents];
  }, [allPrograms, students]);

  // When modal opens, fetch students and RESET filters
  useEffect(() => {
    if (!show) return;
    setQ("");
    setProgram("All");
    setGradYearMin("");
    setProgramPending("All");
    setYearSelectPending("");
    setYearCustomPending("");
    setSelectedIds([]);
    setCurrentPage(1);
    dispatch(getPassingStudents({}));
  }, [show, dispatch]);

  const applyServerFilters = useCallback(
    (programValue, searchValue) => {
      const filters = {};
      if (searchValue) filters.q = searchValue;
      if (programValue && programValue !== "All")
        filters.programs = programValue;
      dispatch(getPassingStudents(filters));
    },
    [dispatch]
  );

  const applyToolbar = useCallback(() => {
    applyServerFilters(program, q);
    setCurrentPage(1);
  }, [applyServerFilters, program, q]);

  const resetToolbar = useCallback(() => {
    setQ("");
    setProgram("All");
    setGradYearMin("");
    setProgramPending("All");
    setYearSelectPending("");
    setYearCustomPending("");
    dispatch(getPassingStudents({}));
    setSelectedIds([]);
    setCurrentPage(1);
  }, [dispatch]);

  const applyModalFilters = useCallback(() => {
    let resolvedYear = "";
    if (yearSelectPending === "custom") {
      const n = parseInt(yearCustomPending, 10);
      if (!Number.isNaN(n)) resolvedYear = String(n);
    } else if (yearSelectPending) {
      resolvedYear = String(parseInt(yearSelectPending, 10));
    }

    setProgram(programPending);
    setGradYearMin(resolvedYear);

    applyServerFilters(programPending, q);
    setCurrentPage(1);
    setShowFilterSettings(false);
  }, [
    applyServerFilters,
    programPending,
    yearSelectPending,
    yearCustomPending,
    q,
  ]);

  // Client-side grad year filter
  const filteredStudents = useMemo(() => {
    let list = students || [];
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
  }, [students, gradYearMin]);

  // Clamp current page
  useEffect(() => {
    setCurrentPage((p) => {
      const max = Math.max(
        1,
        Math.ceil(filteredStudents.length / rowsPerPage)
      );
      return Math.min(p, max);
    });
  }, [filteredStudents.length, rowsPerPage]);

  const indexOfLast = Math.min(
    filteredStudents.length,
    currentPage * rowsPerPage
  );
  const indexOfFirst = Math.max(0, indexOfLast - rowsPerPage);
  const visibleStudents = useMemo(
    () => filteredStudents.slice(indexOfFirst, indexOfLast),
    [filteredStudents, indexOfFirst, indexOfLast]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / rowsPerPage)
  );

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleAllOnPage = useCallback(() => {
    const ids = visibleStudents.map((s) => s._id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])]
    );
  }, [visibleStudents, selectedIds]);

  const clearSelection = () => setSelectedIds([]);

  const handleUseSelected = () => {
    const list = (students || []).filter((s) => selectedIds.includes(s._id));
    if (!list.length) {
      alert("Select at least one student from the list.");
      return;
    }
    onAdd(list);
    onHide();
  };

  const baseColCount = 7;

  return (
    <Modal show={show} onHide={onHide} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Select Students from DB</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Toolbar: search + filter icon */}
        <Card className="mb-3">
          <Card.Body>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                applyToolbar();
              }}
            >
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <InputGroup className="flex-grow-1">
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by name, student no., program…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Button type="submit" variant="primary">
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={resetToolbar}
                  >
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
              </div>

              {/* badges + selection actions */}
              <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                {q ? (
                  <Badge bg="light" text="dark">
                    q: {q}
                  </Badge>
                ) : null}
                {program && program !== "All" ? (
                  <Badge bg="light" text="dark">
                    Program: {program}
                  </Badge>
                ) : null}
                {gradYearMin ? (
                  <Badge bg="light" text="dark">
                    Grad ≥ {gradYearMin}
                  </Badge>
                ) : null}
                <Badge bg="secondary">Selected: {selectedIds.length}</Badge>

                <div className="ms-auto d-flex gap-2">
                  <Button
                    variant="outline-dark"
                    size="sm"
                    type="button"
                    onClick={toggleAllOnPage}
                  >
                    Toggle All (page)
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    type="button"
                    onClick={clearSelection}
                    disabled={!selectedIds.length}
                  >
                    Clear Selected
                  </Button>
                </div>
              </div>
            </Form>
          </Card.Body>
        </Card>

        {isError && message && (
          <Alert variant="danger" className="mb-3">
            {String(message)}
          </Alert>
        )}

        {/* Students table */}
        <Card>
          <Card.Body>
            <div className="table-responsive">
              <Table bordered hover size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }} />
                    <th>#</th>
                    <th>Student No.</th>
                    <th>Full Name</th>
                    <th>Program</th>
                    <th>Date Graduated</th>
                    <th style={{ width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={baseColCount} className="text-center py-5">
                        <Spinner animation="border" className="me-2" />
                        Loading students…
                      </td>
                    </tr>
                  ) : visibleStudents.length ? (
                    visibleStudents.map((stu, idx) => {
                      const isChecked = selectedIds.includes(stu._id);
                      const dateGraduated = toDateOnly(stu.dateGraduated);

                      const fullName =
                        stu.fullName ||
                        `${stu.lastName || ""}, ${stu.firstName || ""}${
                          stu.middleName ? " " + stu.middleName : ""
                        }`.trim() ||
                        "—";

                      return (
                        <tr
                          key={stu._id}
                          className={isChecked ? "table-success" : ""}
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            if (e.target.closest("button, a, input, label")) {
                              return;
                            }
                            toggleSelected(stu._id);
                          }}
                        >
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelected(stu._id);
                              }}
                            />
                          </td>
                          <td>{indexOfFirst + idx + 1}</td>
                          <td>{stu.studentNumber || "—"}</td>
                          <td>{fullName}</td>
                          <td>{stu.program || "—"}</td>
                          <td>{dateGraduated || "—"}</td>
                          <td>
                            <Badge bg="light" text="dark">
                              In DB
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={baseColCount} className="text-center py-4">
                        No students found. Try adjusting filters.
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
                    <li
                      className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                    >
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
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(i + 1)}
                        >
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleUseSelected}
          disabled={!selectedIds.length}
        >
          Add Selected
        </Button>
      </Modal.Footer>

      {/* Filter settings modal (inside main modal) */}
      <Modal
        show={showFilterSettings}
        onHide={() => setShowFilterSettings(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Student Filters</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <div>
              <Form.Label>Program</Form.Label>
              <Form.Select
                value={programPending}
                onChange={(e) => setProgramPending(e.target.value)}
              >
                {programOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Programs are derived from currently loaded data.
              </Form.Text>
            </div>

            <div>
              <Form.Label>Graduation Year (≥)</Form.Label>
              <Form.Select
                value={yearSelectPending}
                onChange={(e) => setYearSelectPending(e.target.value)}
              >
                <option value="">(Any year)</option>
                <optgroup label="Presets">
                  {quickYears.map((y) => (
                    <option key={`q-${y}`} value={y}>
                      {y}
                    </option>
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
                    placeholder="Type year, e.g. 2023"
                    value={yearCustomPending}
                    onChange={(e) =>
                      setYearCustomPending(e.target.value.replace(/[^\d]/g, ""))
                    }
                  />
                  <Form.Text className="text-muted">
                    Students who graduated in this year or later will be shown
                    (client-side).
                  </Form.Text>
                </div>
              )}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            type="button"
            onClick={() => setShowFilterSettings(false)}
          >
            Close
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={applyModalFilters}
          >
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
}

/* --------------------------------- page --------------------------------- */

export default function IssueCredentials() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth?.user?.token);

  // from issueSlice
  const { isLoadingIssue, isError, message } = useSelector(
    (s) => s.issue || {}
  );

  // Recipients in-memory table
  const [recipients, setRecipients] = useState([]);

  // Finalize section state
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  const [vcType, setVcType] = useState(""); // tor|diploma

  const [purpose, setPurpose] = useState("");
  const [otherPurpose, setOtherPurpose] = useState("");

  const [anchorNow, setAnchorNow] = useState(false);
  const [expirationMode, setExpirationMode] = useState("12m"); // default to 12 months
  const [expirationDate, setExpirationDate] = useState("");
  const [showExpSettings, setShowExpSettings] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState({
    studentRows: [],
    gradeRows: [],
    recipients: [],
    shouldSeedDb: false,
  });

  // Confirm + progress + success modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [showSuccess, setShowSuccess] = useState(false);
  const [successStats, setSuccessStats] = useState({
    created: 0,
    duplicates: 0,
    errors: 0,
    totalRequested: 0,
  });

  // View details modal
  const [showDetails, setShowDetails] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState(null);

  // Add-from-DB modal
  const [showAddFromDb, setShowAddFromDb] = useState(false);

  // Load templates once
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoadingTemplates(true);
      setTemplatesError(null);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await fetch(`${API_URL}/api/web/templates`, config).then(
          (r) => r.json()
        );
        const list = Array.isArray(res) ? res : res.items || [];
        setTemplates(list);
        if (list.length && !templateId) {
          const first = list[0];
          setTemplateId(first._id);
          setVcType(
            normalizeType(first.type || first.name || first.slug || "")
          );
        }
      } catch (err) {
        console.error(err);
        setTemplatesError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load templates."
        );
      } finally {
        setLoadingTemplates(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // keep vcType synced when template changes
  useEffect(() => {
    if (!templateId || !templates.length) return;
    const t = templates.find((x) => x._id === templateId);
    if (!t) return;
    const detected = normalizeType(t.type || t.name || t.slug || "");
    if (detected && detected !== vcType) setVcType(detected);
  }, [templateId, templates, vcType]);

  const vcTypeLabel = vcType === "tor" ? "TOR" : "Diploma";

  const computeExpiration = useCallback(() => {
    switch (expirationMode) {
      case "1m":
        return addMonths(1);
      case "3m":
        return addMonths(3);
      case "6m":
        return addMonths(6);
      case "12m":
        return addMonths(12);
      case "date":
        return expirationDate || null;
      default:
        return null;
    }
  }, [expirationMode, expirationDate]);

  /* --------------------------- recipients table --------------------------- */

  const handleChangeRecipientField = (tempId, field, value) => {
    setRecipients((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );
  };

  const handleRemoveRecipient = (tempId) => {
    setRecipients((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const toggleEditRow = (tempId) => {
    setRecipients((prev) =>
      prev.map((r) =>
        r.tempId === tempId ? { ...r, isEditing: !r.isEditing } : r
      )
    );
  };

  // Merge spreadsheet-imported recipients
  const handleImported = (incoming) => {
    setRecipients((prev) => {
      const existingByNo = new Map(
        prev
          .filter((r) => r.studentNumber)
          .map((r) => [r.studentNumber, r])
      );
      const next = [...prev];

      incoming.recipients.forEach((r) => {
        if (r.studentNumber && existingByNo.has(r.studentNumber)) {
          const old = existingByNo.get(r.studentNumber);
          const merged = {
            ...r,
            ...old,
            fullName: old.fullName || r.fullName,
            program: old.program || r.program,
            dateGraduated: old.dateGraduated || r.dateGraduated,
          };
          const idx = next.findIndex((x) => x.tempId === old.tempId);
          if (idx >= 0) next[idx] = merged;
        } else {
          next.push(r);
        }
      });

      return next;
    });

    setImportPreview({
      studentRows: incoming.studentRows,
      gradeRows: incoming.gradeRows,
      recipients: incoming.recipients,
      shouldSeedDb: incoming.shouldSeedDb === true,
    });
    setShowImport(false);
  };

  // Merge DB-selected students into recipients
  const handleAddFromDb = (studentsToAdd) => {
    setRecipients((prev) => {
      const existingByNo = new Map(
        prev
          .filter((r) => r.studentNumber)
          .map((r) => [r.studentNumber, r])
      );
      const next = [...prev];

      studentsToAdd.forEach((stu) => {
        const studentNumber = stu.studentNumber || "";
        const fullName =
          stu.fullName ||
          `${stu.lastName || ""}, ${stu.firstName || ""}${
            stu.middleName ? " " + stu.middleName : ""
          }`.trim();
        const program = stu.program || "";
        const dateGraduated = toDateOnly(stu.dateGraduated);

        if (studentNumber && existingByNo.has(studentNumber)) {
          const old = existingByNo.get(studentNumber);
          const merged = {
            ...old,
            studentNumber,
            fullName: old.fullName || fullName || studentNumber || "—",
            program: old.program || program,
            dateGraduated: old.dateGraduated || dateGraduated,
            studentData: stu,
            studentId: old.studentId || stu._id, // keep/link DB _id
          };
          const idx = next.findIndex((x) => x.tempId === old.tempId);
          if (idx >= 0) next[idx] = merged;
        } else {
          next.push({
            tempId: Math.random().toString(36).slice(2),
            studentNumber,
            fullName: fullName || studentNumber || "—",
            dateGraduated,
            program,
            studentData: stu,
            studentId: stu._id, // store DB _id for issuing payload
            grades: [],
            isEditing: false,
          });
        }
      });

      return next;
    });
  };

  const totalRecipients = recipients.length;

  const openDetails = (row) => {
    setDetailsTarget(row);
    setShowDetails(true);
  };
  const closeDetails = () => {
    setShowDetails(false);
    setDetailsTarget(null);
  };

  /* ----------------------------- issuing flow ----------------------------- */

  const handleClickIssue = () => {
    if (!templateId) return alert("Please select a VC template.");
    if (!vcType) return alert("Please choose VC Type (TOR or Diploma).");

    const rawPurpose = purpose === "other" ? otherPurpose : purpose;
    if (!rawPurpose)
      return alert("Please select purpose or specify an Other purpose.");
    if (!recipients.length)
      return alert("Please add at least one credential recipient.");

    setShowConfirm(true);
  };

  const actuallyIssue = async () => {
    const exp = computeExpiration();
    const rawPurpose = purpose === "other" ? otherPurpose : purpose;
    const normalizedPurpose = normalizePurpose(rawPurpose);

    const recipientsPayload = recipients
      .filter((r) => r.studentNumber && r.studentNumber.trim() !== "")
      .map((r) => ({
        studentId: r.studentId || r.studentData?._id || undefined,
        studentNumber: r.studentNumber.trim(),
        fullName: r.fullName || "",
        program: r.program || "",
        dateGraduated: r.dateGraduated || "",
        // ✅ NEW: send DOB if we have it
        dateOfBirth:
          r.dateOfBirth ||
          r.studentData?.dateOfBirth ||
          "",
      }));


    if (!recipientsPayload.length) {
      alert("All recipients are missing student numbers.");
      return;
    }

    // spreadsheet-style rows so the backend can upsert only when requested
    const studentDataRows = importPreview.shouldSeedDb
      ? recipients.map((r) => r.studentData).filter(Boolean)
      : [];
    const gradeRows = importPreview.shouldSeedDb
      ? recipients.flatMap((r) => r.grades || [])
      : [];

    const payload = {
      templateId,
      type: vcType, // "tor" | "diploma"
      purpose: normalizedPurpose,
      expiration: exp || "N/A",
      anchorNow: !!anchorNow,
      recipients: recipientsPayload,
      studentDataRows,
      gradeRows,
      seedDb: importPreview.shouldSeedDb === true,
    };

    const totalRequested = recipientsPayload.length;

    setProgress({ current: 0, total: totalRequested });
    setShowProgress(true);

    try {
      const result = await dispatch(issueCredentialsThunk(payload)).unwrap();

      setProgress({
        current: totalRequested,
        total: totalRequested,
      });

      // --------- derive stats safely ---------
      let createdCount = totalRequested;
      let duplicateCount = 0;
      let errorCount = 0;

      const clampInt = (n) =>
        Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;

      if (result && typeof result === "object") {
        if (typeof result.createdCount === "number") {
          createdCount = result.createdCount;
        } else if (Array.isArray(result.created)) {
          createdCount = result.created.length;
        }

        if (typeof result.duplicateCount === "number") {
          duplicateCount = result.duplicateCount;
        } else if (Array.isArray(result.duplicates)) {
          duplicateCount = result.duplicates.length;
        }

        if (typeof result.errorCount === "number") {
          errorCount = result.errorCount;
        } else if (Array.isArray(result.errors)) {
          errorCount = result.errors.length;
        }
      }

      createdCount = clampInt(createdCount);
      duplicateCount = clampInt(duplicateCount);
      errorCount = clampInt(errorCount);

      let sum = createdCount + duplicateCount + errorCount;

      if (sum === 0) {
        createdCount = totalRequested;
        duplicateCount = 0;
        errorCount = 0;
      } else if (
        createdCount === 0 &&
        duplicateCount === 0 &&
        errorCount === totalRequested
      ) {
        createdCount = totalRequested;
        errorCount = 0;
      } else if (sum > totalRequested) {
        const overflow = sum - totalRequested;
        errorCount = clampInt(errorCount - overflow);
      } else if (sum < totalRequested) {
        createdCount += totalRequested - sum;
      }

      setSuccessStats({
        created: createdCount,
        duplicates: duplicateCount,
        errors: errorCount,
        totalRequested,
      });

      // ✅ Clear recipients table after a successful issuance
      setRecipients([]);

      // Clear import preview (so next import is fresh)
      setImportPreview({
        studentRows: [],
        gradeRows: [],
        recipients: [],
        shouldSeedDb: false,
      });

      // Optionally refresh DB list so newly seeded students are visible
      if (importPreview.shouldSeedDb) {
        dispatch(getPassingStudents({}));
      }

      setShowSuccess(true);
    } catch (err) {
      alert(
        typeof err === "string"
          ? err
          : err?.message || "Failed to issue credentials."
      );
    } finally {
      setTimeout(() => setShowProgress(false), 400);
    }
  };

  const handleConfirmClose = (ok) => {
    setShowConfirm(false);
    if (!ok) return;
    actuallyIssue();
  };

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <section className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <Button as={NavLink} to="/vc/draft" variant="outline-secondary">
            <FaArrowLeft className="me-2" />
            Back
          </Button>
        </div>
        <h1 className="h4 mb-0">Add recipients</h1>
        <div className="d-flex gap-2">
          <Button
            variant="primary"
            onClick={handleClickIssue}
            disabled={isLoadingIssue || !totalRecipients}
          >
            {isLoadingIssue ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Issuing…
              </>
            ) : (
              "Issue Credentials"
            )}
          </Button>
        </div>
      </div>

      {/* Error from issuance */}
      {isError && message && (
        <Alert variant="danger" className="mb-3">
          {String(message)}
        </Alert>
      )}

      {/* Recipients card */}
      <Card className="mb-3">
        <Card.Body>
          <div className="table-responsive" style={{ minHeight: 220 }}>
            <Table bordered hover size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Student No.</th>
                  <th>Full Name</th>
                  <th>Date Graduated</th>
                  <th>Program</th>
                  <th style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      Add credential recipients to see data here
                    </td>
                  </tr>
                ) : (
                  recipients.map((r, idx) => (
                    <tr key={r.tempId}>
                      <td>{idx + 1}</td>
                      <td>
                        {r.isEditing ? (
                          <Form.Control
                            size="sm"
                            value={r.studentNumber || ""}
                            onChange={(e) =>
                              handleChangeRecipientField(
                                r.tempId,
                                "studentNumber",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span>{r.studentNumber || "—"}</span>
                        )}
                      </td>
                      <td>
                        {r.isEditing ? (
                          <Form.Control
                            size="sm"
                            value={r.fullName || ""}
                            onChange={(e) =>
                              handleChangeRecipientField(
                                r.tempId,
                                "fullName",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span>{r.fullName || "—"}</span>
                        )}
                      </td>
                      <td>
                        {r.isEditing ? (
                          <Form.Control
                            size="sm"
                            type="date"
                            value={r.dateGraduated || ""}
                            onChange={(e) =>
                              handleChangeRecipientField(
                                r.tempId,
                                "dateGraduated",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span>{r.dateGraduated || "—"}</span>
                        )}
                      </td>
                      <td>
                        {r.isEditing ? (
                          <Form.Control
                            size="sm"
                            value={r.program || ""}
                            onChange={(e) =>
                              handleChangeRecipientField(
                                r.tempId,
                                "program",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span>{r.program || "—"}</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant={r.isEditing ? "primary" : "outline-primary"}
                            title={r.isEditing ? "Done editing" : "Edit row"}
                            onClick={() => toggleEditRow(r.tempId)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            title="View details"
                            onClick={() => openDetails(r)}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            title="Remove"
                            onClick={() => handleRemoveRecipient(r.tempId)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* bottom bar */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted small">
              {totalRecipients
                ? `${totalRecipients} student${totalRecipients === 1 ? "" : "s"}`
                : "No recipients yet"}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={() => setShowAddFromDb(true)}
              >
                Add from Student DB
              </Button>
              <Button variant="primary" onClick={() => setShowImport(true)}>
                Import Spreadsheet
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* SETTINGS / FINALIZE card */}
      <Card>
        <Card.Header className="bg-light">
          <strong>Settings</strong>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {/* Template */}
            <Col md={6}>
              <Form.Label className="small text-muted mb-1">
                VC Template
              </Form.Label>
              <InputGroup>
                <Form.Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={loadingTemplates}
                >
                  {templates.length === 0 && (
                    <option value="">No templates</option>
                  )}
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name || t.slug || t._id}
                    </option>
                  ))}
                </Form.Select>
                {loadingTemplates && (
                  <InputGroup.Text>
                    <Spinner animation="border" size="sm" />
                  </InputGroup.Text>
                )}
              </InputGroup>
              {templatesError && (
                <Alert variant="warning" className="mt-2 mb-0">
                  {templatesError}
                </Alert>
              )}
              <Form.Text className="text-muted">
                VC type follows the selected template automatically.
              </Form.Text>
            </Col>

            {/* Purpose + Other option */}
            <Col md={6}>
              <Form.Label className="small text-muted mb-1">Purpose</Form.Label>
              <Form.Select
                value={purpose}
                onChange={(e) => {
                  const val = e.target.value;
                  setPurpose(val);
                  if (val !== "other") setOtherPurpose("");
                }}
              >
                <option value="">Select purpose…</option>
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="other">Other (specify)…</option>
              </Form.Select>

              {purpose === "other" ? (
                <>
                  <Form.Control
                    className="mt-2"
                    placeholder="Type specific purpose…"
                    value={otherPurpose}
                    onChange={(e) => setOtherPurpose(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    This exact text will be saved as the purpose.
                  </Form.Text>
                </>
              ) : (
                <Form.Text className="text-muted">
                  Only approved purposes are accepted. Choose <em>Other</em> for
                  special cases.
                </Form.Text>
              )}
            </Col>

            {/* Anchor */}
            <Col md={6}>
              <Form.Label className="small text-muted mb-1">Anchor</Form.Label>
              <Form.Check
                type="switch"
                id="anchor-switch"
                label="Anchor on chain"
                checked={anchorNow}
                onChange={(e) => setAnchorNow(e.target.checked)}
              />
              <div className="small text-muted mb-0">
                Off by default. Anchoring typically happens after signing in
                your flow.
              </div>
            </Col>

            {/* Expiration */}
            <Col md={6}>
              <Form.Label className="small text-muted mb-1">
                Expiration
              </Form.Label>

              {expirationMode === "date" ? (
                <>
                  <InputGroup>
                    <Form.Control
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                    <Button
                      variant="outline-dark"
                      type="button"
                      title="Expiration settings"
                      onClick={() => setShowExpSettings(true)}
                    >
                      <FaCog />
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Pick a specific expiry date (YYYY-MM-DD).
                  </Form.Text>
                </>
              ) : (
                <InputGroup>
                  <Form.Select
                    value={expirationMode}
                    onChange={(e) => setExpirationMode(e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="1m">1 month</option>
                    <option value="3m">3 months</option>
                    <option value="6m">6 months</option>
                    <option value="12m">12 months</option>
                    <option value="date">Specific date…</option>
                  </Form.Select>
                  <Button
                    variant="outline-dark"
                    type="button"
                    title="Expiration settings"
                    onClick={() => setShowExpSettings(true)}
                  >
                    <FaCog />
                  </Button>
                </InputGroup>
              )}
              <Form.Text className="text-muted">
                Default is <strong>12 months</strong>.
              </Form.Text>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Expiration settings modal */}
      <Modal
        show={showExpSettings}
        onHide={() => setShowExpSettings(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Expiration Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="d-grid gap-3">
            <div>
              <Form.Label>Expiration preset</Form.Label>
              <Form.Select
                value={expirationMode}
                onChange={(e) => setExpirationMode(e.target.value)}
              >
                <option value="none">None</option>
                <option value="1m">1 month</option>
                <option value="3m">3 months</option>
                <option value="6m">6 months</option>
                <option value="12m">12 months</option>
                <option value="date">Specific date…</option>
              </Form.Select>
            </div>

            {expirationMode === "date" && (
              <div>
                <Form.Label>Choose date</Form.Label>
                <Form.Control
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            type="button"
            onClick={() => setShowExpSettings(false)}
          >
            Close
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => setShowExpSettings(false)}
          >
            Done
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modals: Import, Confirm, Progress, Success, Details, AddFromDB */}
      <ImportSpreadsheetModal
        show={showImport}
        onHide={() => setShowImport(false)}
        onImported={handleImported}
        preview={importPreview}
        setPreview={setImportPreview}
      />

      <AddFromRegistryModal
        show={showAddFromDb}
        onHide={() => setShowAddFromDb(false)}
        onAdd={handleAddFromDb}
      />

      <ConfirmIssueModal
        show={showConfirm}
        count={totalRecipients}
        vcTypeLabel={vcTypeLabel}
        onClose={handleConfirmClose}
      />

      <IssueProgressModal
        show={showProgress}
        total={progress.total}
        current={progress.current}
      />

      <IssueSuccessModal
        show={showSuccess}
        stats={successStats}
        onClose={() => setShowSuccess(false)}
      />

      <RecipientDetailsModal
        show={showDetails}
        onHide={closeDetails}
        recipient={detailsTarget}
      />
    </section>
  );
}

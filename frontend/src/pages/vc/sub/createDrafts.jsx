// src/pages/CreateDrafts.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Modal,
} from "react-bootstrap";
import { NavLink, useSearchParams } from "react-router-dom";
import { FaSearch, FaCog, FaArrowLeft, FaEye } from "react-icons/fa";
import { API_URL } from "../../../../config";

import { getPassingStudents, getStudentById } from "../../../features/student/studentSlice";
import { createDrafts as createDraftsThunk } from "../../../features/draft_vc/vcSlice";

/* ----------------------------- helpers ----------------------------- */
const normalizeType = (value = "") => {
  const v = String(value).toLowerCase();
  if (v.includes("tor")) return "tor";
  if (v.includes("diploma")) return "diploma";
  return "";
};
const detectTypeFromTemplate = (t = {}) =>
  normalizeType(t.type || t.name || t.slug || "");

const extractVersion = (t = {}) => {
  const direct = t?.version;
  if (direct !== undefined && direct !== null && direct !== "") {
    const n = Number(direct);
    if (Number.isFinite(n)) return n.toFixed(2);
    const parsed = parseFloat(String(direct).replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed)) return parsed.toFixed(2);
  }
  const hay = String(t?.name || t?.slug || "");
  const m = hay.match(/v\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (!Number.isNaN(n)) return n.toFixed(2);
  }
  return null;
};

const formatTemplateLabel = (t = {}) => {
  const type = detectTypeFromTemplate(t);
  const pretty = type === "tor" ? "TOR" : "Diploma";
  const ver = extractVersion(t);
  return ver ? `${pretty} (v${ver})` : pretty;
};

// UTC-safe YYYY-MM-DD
const ymdUTC = (d) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);

// Add N months from today, return UTC yyyy-mm-dd
const addMonths = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return ymdUTC(d);
};

// Date-only renderer
const toDateOnly = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
};

// Result utils
const getTxFromItem = (it = {}) =>
  it.tx_no || it.txNo || it.payment_tx_no || it.paymentTxNo || it.tx || "";

const getStudentIdFromItem = (it = {}) =>
  it.studentId || it.student_id || it.student?._id || it.student || "";

const getTypeFromItem = (it = {}) => normalizeType(it.type || "");

const getNameFromItem = (it = {}, fallbackName = "") =>
  it.student?.fullName ||
  it.student?.name ||
  it.name ||
  it.fullName ||
  fallbackName ||
  "";

// Normalize purpose
const normalizePurpose = (v = "") => String(v).trim().toLowerCase();

// 🎓 Approved purposes
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
  { value: "personal / general reference", label: "Personal / General Reference" },
  { value: "overseas employment", label: "Overseas Employment" },
  { value: "training / seminar", label: "Training / Seminar" },
];

/* --------------------------- small components --------------------------- */
function TxViewerModal({ show, onHide, txNo }) {
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(txNo || "");
    } catch {}
  }, [txNo]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>TX No</Modal.Title>
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

function ConfirmCreateModal({ show, onHide, items, vcTypeLabel }) {
  const isSingle = items.length === 1;
  return (
    <Modal show={show} onHide={() => onHide(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Draft{isSingle ? "" : "s"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isSingle ? (
          <p className="mb-0">
            Confirm draft for <strong>{items[0].name}</strong> –{" "}
            <strong>{vcTypeLabel}</strong>?
          </p>
        ) : (
          <>
            <div className="mb-2">
              You are about to create <strong>{items.length}</strong> drafts:
            </div>
            <div className="table-responsive">
              <Table size="sm" bordered className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.studentId || i}>
                      <td>{i + 1}</td>
                      <td>{it.name}</td>
                      <td>{vcTypeLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => onHide(false)}>
          Cancel
        </Button>
        <Button variant="success" onClick={() => onHide(true)}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function SingleSuccessModal({
  show,
  onHide,
  item,
  toDraftsPath = "/vc/draft",
  onViewTx,
}) {
  const name = item?.name || "—";
  const type = item?.type || "—";
  return (
    <Modal show={show} onHide={() => onHide()} centered>
      <Modal.Header closeButton>
        <Modal.Title>VC Draft Created</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-2">
          <strong>{name}</strong> – <strong>{type.toUpperCase()}</strong>
        </p>
        <div className="d-flex gap-2">
          <Button as={NavLink} to={toDraftsPath} variant="primary">
            Go to Drafts
          </Button>
          <Button variant="outline-secondary" onClick={onViewTx}>
            View TX No.
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => onHide()}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function BatchSuccessModal({
  show,
  onHide,
  items,
  toDraftsPath = "/vc/draft",
  onViewRowTx,
}) {
  return (
    <Modal show={show} onHide={() => onHide()} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Drafts Created</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="table-responsive">
          <Table size="sm" bordered className="mb-2 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Name</th>
                <th>Type</th>
                <th style={{ width: 100 }}>TX</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((it, i) => (
                  <tr key={it.draftId || it.studentId || i}>
                    <td>{i + 1}</td>
                    <td>{it.name || "—"}</td>
                    <td>{(it.type || "").toUpperCase()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        title="View TX"
                        onClick={() => onViewRowTx(getTxFromItem(it))}
                      >
                        <FaEye className="me-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center">
                    No created rows to display.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        <div className="d-flex justify-content-end">
          <Button as={NavLink} to={toDraftsPath} variant="primary">
            Go to Draft Registry
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}

function DuplicateErrorModal({ show, onHide, duplicates = [] }) {
  return (
    <Modal show={show} onHide={() => onHide(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Some Students Already Have Drafts</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-2">
          The following student(s) already have existing draft(s) for this type/purpose:
        </div>
        <ul className="mb-0">
          {duplicates.length ? duplicates.map((n, i) => <li key={i}>{n}</li>) : <li>—</li>}
        </ul>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => onHide(false)}>
          Cancel
        </Button>
        <Button variant="warning" onClick={() => onHide(true)}>
          Continue (draft remaining)
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------------- page --------------------------------- */
export default function CreateDrafts() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth?.user?.token);
  const [searchParams] = useSearchParams();
  const qsStudentNumber = searchParams.get("studentNumber") || "";

  const {
    students,
    isLoadingList: loadingStudents,
    isError: studentsError,
    message: studentsMessage,
    allPrograms,
    isLoadingDetail,
    student: studentDetail,
  } = useSelector((s) => s.student);

  const { isLoadingCreate } = useSelector((s) => s.vc || {});

  // Toolbar & applied filters
  const [q, setQ] = useState("");
  const [program, setProgram] = useState("All");
  const [gradYearMin, setGradYearMin] = useState("");

  // Modal (pending) filters
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [programPending, setProgramPending] = useState("All");
  const [yearSelectPending, setYearSelectPending] = useState(""); // "" | "YYYY" | "custom"
  const [yearCustomPending, setYearCustomPending] = useState(""); // numeric

  // Selection
  const [selectedRows, setSelectedRows] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Templates + VC type
  const [templates, setTemplates] = useState([]);
  const [templatesError, setTemplatesError] = useState(null);
  const [templateId, setTemplateId] = useState("");
  const [vcType, setVcType] = useState(""); // "tor" | "diploma"
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Finalize
  const [purpose, setPurpose] = useState("");
  const [anchorNow, setAnchorNow] = useState(false);
  const [expirationMode, setExpirationMode] = useState("none"); // none|1m|3m|6m|12m|date
  const [expirationDate, setExpirationDate] = useState("");
  const [showExpSettings, setShowExpSettings] = useState(false);

  // Flow modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmItems, setConfirmItems] = useState([]); // {studentId, name}[]
  const [showSingleSuccess, setShowSingleSuccess] = useState(false);
  const [singleSuccessItem, setSingleSuccessItem] = useState(null);
  const [showBatchSuccess, setShowBatchSuccess] = useState(false);
  const [batchSuccessItems, setBatchSuccessItems] = useState([]); // [{name,type,tx_no,...}]
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const [dupNames, setDupNames] = useState([]); // names
  const [dupIds, setDupIds] = useState([]); // ids

  // TX Modal
  const [showTx, setShowTx] = useState(false);
  const [txNoToShow, setTxNoToShow] = useState("");

  // View modal (for student details)
  const [showView, setShowView] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState(null);

  /* ---------------------- derived & persistence ---------------------- */
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

  // Load saved filters (students) on mount — BUT if studentNumber is in URL, prefill and APPLY immediately.
  useEffect(() => {
    if (qsStudentNumber) {
      setQ(qsStudentNumber); // prefill input
      dispatch(getPassingStudents({ q: qsStudentNumber })); // auto-apply
      setCurrentPage(1);
      return; // don't overwrite with saved filters
    }

    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem("lastStudentFilters")) || {};
      } catch {
        return {};
      }
    })();

    setQ(typeof saved.q === "string" ? saved.q : "");
    setProgram(typeof saved.programs === "string" ? saved.programs : "All");

    const savedYear =
      typeof saved.gradYearMin !== "undefined" && saved.gradYearMin !== null
        ? String(saved.gradYearMin)
        : "";
    setGradYearMin(savedYear);

    // Pending mirrors applied
    setProgramPending(typeof saved.programs === "string" ? saved.programs : "All");
    if (savedYear) {
      if (quickYears.includes(savedYear)) {
        setYearSelectPending(savedYear);
        setYearCustomPending("");
      } else {
        setYearSelectPending("custom");
        setYearCustomPending(savedYear);
      }
    } else {
      setYearSelectPending("");
      setYearCustomPending("");
    }

    // Initial server fetch (q + program only) when no studentNumber in URL
    const initialServerFilters = {
      ...(saved.q ? { q: saved.q } : {}),
      ...(saved.programs && saved.programs !== "All" ? { programs: saved.programs } : {}),
    };
    dispatch(getPassingStudents(initialServerFilters));
  }, [dispatch, quickYears, qsStudentNumber]);

  // Load templates (once per token)
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoadingTemplates(true);
      setTemplatesError(null);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${API_URL}/api/web/templates`, config);
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setTemplates(list);

        if (list.length && !templateId) {
          const first = list[0];
          setTemplateId(first._id);
          setVcType(detectTypeFromTemplate(first) || "diploma");
        }
      } catch (err) {
        console.error(err);
        setTemplatesError(
          err?.response?.data?.message || err?.message || "Failed to load templates."
        );
      } finally {
        setLoadingTemplates(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Keep vcType in sync when template changes
  useEffect(() => {
    if (!templateId || !templates.length) return;
    const t = templates.find((x) => x._id === templateId);
    if (!t) return;
    const detected = detectTypeFromTemplate(t);
    if (detected && detected !== vcType) setVcType(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, templates]);

  // If vcType changes and template mismatches, pick first template of that type
  useEffect(() => {
    if (!vcType || !templates.length) return;
    const current = templates.find((x) => x._id === templateId);
    const currentType = detectTypeFromTemplate(current);
    if (currentType === vcType) return;
    const candidate = templates.find((t) => detectTypeFromTemplate(t) === vcType);
    if (candidate) setTemplateId(candidate._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcType, templates]);

  // Build server filters (q + program only)
  const buildServerFilters = useCallback(
    (programValue) => ({
      ...(q ? { q } : {}),
      ...(programValue && programValue !== "All" ? { programs: programValue } : {}),
    }),
    [q]
  );

  /* ---------------------------- actions/handlers ---------------------------- */
  const applyToolbar = useCallback(() => {
    const serverFilters = buildServerFilters(program);
    const toSave = { ...serverFilters, ...(gradYearMin ? { gradYearMin } : {}) };
    localStorage.setItem("lastStudentFilters", JSON.stringify(toSave));
    dispatch(getPassingStudents(serverFilters));
    setCurrentPage(1);
  }, [buildServerFilters, program, gradYearMin, dispatch]);

  const resetAll = useCallback(() => {
    // applied
    setQ("");
    setProgram("All");
    setGradYearMin("");
    // pending
    setProgramPending("All");
    setYearSelectPending("");
    setYearCustomPending("");
    localStorage.setItem("lastStudentFilters", JSON.stringify({}));
    dispatch(getPassingStudents({}));
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

    const serverFilters = buildServerFilters(programPending);
    const toSave = {
      ...serverFilters,
      ...(resolvedYear ? { gradYearMin: resolvedYear } : {}),
    };
    localStorage.setItem("lastStudentFilters", JSON.stringify(toSave));
    dispatch(getPassingStudents(serverFilters));
    setCurrentPage(1);
    setShowFilterSettings(false);
  }, [
    buildServerFilters,
    programPending,
    yearSelectPending,
    yearCustomPending,
    dispatch,
  ]);

  // Client-side filter for Graduation Year >= gradYearMin
  const filteredStudents = useMemo(() => {
    let list = students || [];
    if (gradYearMin) {
      const min = parseInt(gradYearMin, 10);
      if (!isNaN(min)) {
        list = list.filter((s) => {
          if (!s?.dateGraduated) return false;
          const y = new Date(s.dateGraduated).getFullYear();
          return y >= min;
        });
      }
    }
    return list;
  }, [students, gradYearMin]);

  // Clamp currentPage when list changes
  useEffect(() => {
    setCurrentPage((p) => {
      const max = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
      return Math.min(p, max);
    });
  }, [filteredStudents.length, rowsPerPage]);

  // Page slice
  const indexOfLast = Math.min(filteredStudents.length, currentPage * rowsPerPage);
  const indexOfFirst = Math.max(0, indexOfLast - rowsPerPage);
  const visibleStudents = useMemo(
    () => filteredStudents.slice(indexOfFirst, indexOfLast),
    [filteredStudents, indexOfFirst, indexOfLast]
  );
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));

  // Selection helpers
  const toggleRow = useCallback(
    (id) =>
      setSelectedRows((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      ),
    []
  );

  const selectAllOnPage = useCallback(() => {
    const ids = visibleStudents.map((s) => s._id);
    const allSelected = ids.every((id) => selectedRows.includes(id));
    setSelectedRows((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  }, [visibleStudents, selectedRows]);

  const clearSelection = useCallback(() => setSelectedRows([]), []);

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
        return null; // none
    }
  }, [expirationMode, expirationDate]);

  /* ------------------------------- create flow ------------------------------ */
  const buildNameFromId = useCallback(
    (id) => ((students || []).find((s) => s._id === id)?.fullName) || "—",
    [students]
  );

  const normalizeCreatedArray = useCallback(
    (createdObj, refreshed, intendedMap) => {
      const explicit =
        (createdObj?.items && Array.isArray(createdObj.items) && createdObj.items) ||
        (createdObj?.createdItems &&
          Array.isArray(createdObj.createdItems) &&
          createdObj.createdItems) ||
        [];

      if (explicit.length) {
        return explicit.map((it) => ({
          studentId: getStudentIdFromItem(it),
          name: getNameFromItem(it, buildNameFromId(getStudentIdFromItem(it))),
          type: getTypeFromItem(it) || intendedMap.type,
          tx_no: getTxFromItem(it),
          draftId: it._id || it.draftId,
        }));
      }

      // Fallback: infer from refreshed
      const wantedIds = new Set(intendedMap.studentIds);
      const intendedType = intendedMap.type;
      const intendedPurpose = intendedMap.purpose;

      const arr = (refreshed || []).filter((d) => {
        const sid = d.student?._id || d.studentId || d.student || "";
        const matchId = sid && wantedIds.has(String(sid));
        const matchType = normalizeType(d.type) === intendedType;
        const matchPurpose = normalizePurpose(d.purpose) === intendedPurpose;
        return matchId && matchType && matchPurpose;
      });

      return arr.map((d) => ({
        studentId: d.student?._id || d.studentId || d.student || "",
        name: d.student?.fullName || d.student?.name || "—",
        type: normalizeType(d.type),
        tx_no: getTxFromItem(d),
        draftId: d._id,
      }));
    },
    [buildNameFromId]
  );

  const normalizeDuplicateArray = useCallback(
    (createdObj) => {
      const dups =
        (createdObj?.duplicates &&
          Array.isArray(createdObj.duplicates) &&
          createdObj.duplicates) ||
        (createdObj?.duplicateItems &&
          Array.isArray(createdObj.duplicateItems) &&
          createdObj.duplicateItems) ||
        [];
      const ids = dups.map((x) =>
        typeof x === "string"
          ? x
          : x?.studentId || x?.student?.id || x?.student?._id || x?.student
      );
      const uniqIds = Array.from(new Set(ids.filter(Boolean).map(String)));
      const names = uniqIds.map((id) => buildNameFromId(id));
      return { ids: uniqIds, names };
    },
    [buildNameFromId]
  );

  const handleClickCreate = useCallback(() => {
    if (!templateId) return alert("Please select a VC template.");
    if (!vcType) return alert("Please choose VC Type (TOR or Diploma).");
    if (!purpose) return alert("Please select Purpose (required).");
    if (selectedRows.length === 0) return alert("Please select at least one student.");

    const items = selectedRows
      .map((id) => {
        const s = (students || []).find((x) => x._id === id);
        return { studentId: id, name: s?.fullName || "—" };
      })
      .filter(Boolean);

    setConfirmItems(items);
    setShowConfirm(true);
  }, [templateId, vcType, purpose, selectedRows, students]);

  const actuallyCreate = useCallback(
    async (studentIdsToCreate) => {
      const exp = computeExpiration();
      const normalizedPurpose = normalizePurpose(purpose);

      const payload = studentIdsToCreate.map((studentId) => ({
        studentId,
        templateId,
        type: vcType,
        purpose: normalizedPurpose,
        anchor: !!anchorNow,
        ...(exp ? { expiration: exp } : {}),
      }));

      const intendedMap = {
        studentIds: studentIdsToCreate.map(String),
        type: vcType,
        purpose: normalizedPurpose,
      };

      try {
        const result = await dispatch(createDraftsThunk(payload)).unwrap();
        const createdObj = result?.created || {};
        const refreshed = result?.refreshed || [];

        const { ids: dupStudentIds, names: dupStudentNames } =
          normalizeDuplicateArray(createdObj);

        if (studentIdsToCreate.length > 1 && dupStudentIds.length) {
          setDupIds(dupStudentIds);
          setDupNames(dupStudentNames);
          setShowDuplicateError(true);
          return;
        }

        const createdItems = normalizeCreatedArray(createdObj, refreshed, intendedMap);

        if (studentIdsToCreate.length === 1) {
          const one =
            createdItems[0] || {
              studentId: studentIdsToCreate[0],
              name: buildNameFromId(studentIdsToCreate[0]),
              type: vcType,
              tx_no: "",
            };
          setSingleSuccessItem(one);
          setShowSingleSuccess(true);
        } else {
          setBatchSuccessItems(createdItems);
          setShowBatchSuccess(true);
        }

        clearSelection();
      } catch (err) {
        alert(typeof err === "string" ? err : err?.message || "Failed to create drafts.");
      }
    },
    [
      computeExpiration,
      purpose,
      templateId,
      vcType,
      anchorNow,
      dispatch,
      normalizeDuplicateArray,
      normalizeCreatedArray,
      buildNameFromId,
      clearSelection,
    ]
  );

  const onConfirmClose = useCallback(
    (ok) => {
      setShowConfirm(false);
      if (!ok) return;
      const ids = confirmItems.map((x) => x.studentId);
      actuallyCreate(ids);
    },
    [confirmItems, actuallyCreate]
  );

  const onDuplicateClose = useCallback(
    (continueDraft) => {
      setShowDuplicateError(false);
      if (!continueDraft) return;

      const dupSet = new Set(dupIds.map(String));
      const remaining = confirmItems
        .map((x) => x.studentId)
        .filter((id) => !dupSet.has(String(id)));

      if (remaining.length) {
        actuallyCreate(remaining);
      }
    },
    [dupIds, confirmItems, actuallyCreate]
  );

  const createDrafts = useCallback(() => handleClickCreate(), [handleClickCreate]);

  const vcTypeLabel = vcType === "tor" ? "TOR" : "Diploma";

  // View actions
  const openView = (id) => {
    setSelectedViewId(id);
    setShowView(true);
    dispatch(getStudentById(id));
  };
  const closeView = () => {
    setShowView(false);
    setSelectedViewId(null);
  };

  /* ---------------------------------- UI ---------------------------------- */
  const baseColCount = 8; // for colSpan in loaders/empties

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <Button as={NavLink} to="/vc/draft" variant="outline-secondary">
            <FaArrowLeft className="me-2" />
            Back to Draft Registry
          </Button>
        </div>
        <h1 className="h4 mb-0">Create Drafts</h1>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={createDrafts} disabled={isLoadingCreate}>
            {isLoadingCreate ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Creating…
              </>
            ) : (
              "Create Drafts"
            )}
          </Button>
        </div>
      </div>

      {/* Toolbar row 1: Search + Apply/Reset + Settings */}
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
            </div>

            {/* Toolbar row 2: applied badges + selection actions */}
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
              <Badge bg="secondary">Selected: {selectedRows.length}</Badge>

              <div className="ms-auto d-flex gap-2">
                <Button
                  variant="outline-dark"
                  size="sm"
                  type="button"
                  onClick={selectAllOnPage}
                >
                  Toggle All (page)
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedRows.length === 0}
                >
                  Clear Selected
                </Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* STUDENTS TABLE */}
      <Card className="mb-3">
        <Card.Body>
          {studentsError && studentsMessage ? (
            <Alert variant="danger" className="mb-3">
              {String(studentsMessage)}
            </Alert>
          ) : null}

          <div className="table-responsive">
            <Table bordered hover size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }} />
                  <th>#</th>
                  <th>Profile</th>
                  <th>Student No.</th>
                  <th>Full Name</th>
                  <th>Program</th>
                  <th>Date Graduated</th>
                  <th style={{ width: 140 }}>Actions</th>
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
                ) : visibleStudents.length > 0 ? (
                  visibleStudents.map((stu, idx) => {
                    const isChecked = selectedRows.includes(stu._id);
                    const dateGraduated = toDateOnly(stu.dateGraduated);

                    return (
                      <tr
                        key={stu._id}
                        onClick={(e) => {
                          if (e.target.closest("button, a, input, label")) return;
                          toggleRow(stu._id);
                        }}
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
                        <td>{indexOfFirst + idx + 1}</td>

                        <td>
                          {stu.photoUrl ? (
                            <img
                              src={stu.photoUrl}
                              alt=""
                              style={{
                                width: 42,
                                height: 42,
                                objectFit: "cover",
                                borderRadius: 6,
                              }}
                            />
                          ) : (
                            <div className="text-muted small">—</div>
                          )}
                        </td>
                        <td>{stu.studentNumber || "—"}</td>
                        <td>{stu.fullName || "—"}</td>
                        <td>{stu.program || "—"}</td>
                        <td>{dateGraduated}</td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              title="View"
                              onClick={(e) => {
                                e.stopPropagation();
                                openView(stu._id);
                              }}
                            >
                              <FaEye />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={baseColCount} className="text-center py-4">
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
                  <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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

      {/* FINALIZE */}
      <Card>
        <Card.Header className="bg-light">
          <strong>Finalize</strong>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {/* Row 1: VC Template (left) + Purpose (right) */}
            <Col md={6}>
              <Form.Label className="small text-muted mb-1">VC Template</Form.Label>
              <InputGroup>
                <Form.Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={loadingTemplates}
                >
                  {templates.length === 0 && <option value="">No templates</option>}
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {formatTemplateLabel(t)}
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

            <Col md={6}>
              <Form.Label className="small text-muted mb-1">Purpose</Form.Label>
              <Form.Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="">Select purpose…</option>
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Only approved purposes are accepted.</Form.Text>
            </Col>

            {/* Row 2: Anchor (left) + Expiration (right) */}
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
                Off by default. Anchoring typically happens after signing in your flow.
              </div>
            </Col>

            <Col md={6}>
              <Form.Label className="small text-muted mb-1">Expiration</Form.Label>
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

              {expirationMode === "date" && (
                <div className="mt-2">
                  <Form.Control
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    Pick a specific expiry date (YYYY-MM-DD).
                  </Form.Text>
                </div>
              )}

              <div className="mt-2">
                <Button
                  variant="outline-dark"
                  className="w-100"
                  title="Expiration settings"
                  type="button"
                  onClick={() => setShowExpSettings(true)}
                >
                  <FaCog className="me-2" />
                  More settings
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>

        <Card.Footer className="d-flex justify-content-end gap-5">
          <Button variant="success" onClick={createDrafts} disabled={isLoadingCreate}>
            {isLoadingCreate ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Creating…
              </>
            ) : (
              "Create Drafts"
            )}
          </Button>
        </Card.Footer>
      </Card>

      {/* Filter settings modal */}
      <Modal show={showFilterSettings} onHide={() => setShowFilterSettings(false)} centered>
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

            {/* Graduation Year (≥) */}
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
                  <Form.Text className="textMuted">
                    Students who graduated in this year or later will be shown.
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
          <Button variant="primary" type="button" onClick={applyModalFilters}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Expiration settings modal */}
      <Modal show={showExpSettings} onHide={() => setShowExpSettings(false)} centered>
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

            {expirationMode === "date" ? (
              <div>
                <Form.Label>Choose date</Form.Label>
                <Form.Control
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
            ) : null}
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
          <Button variant="primary" type="button" onClick={() => setShowExpSettings(false)}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Student Modal (full details) */}
      <Modal show={showView} onHide={closeView} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>View Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoadingDetail ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
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
                    <Form.Control
                      value={studentDetail.studentNumber || ""}
                      disabled
                      readOnly
                    />
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
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={studentDetail.address || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Place of Birth</Form.Label>
                    <Form.Control
                      value={studentDetail.placeOfBirth || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>High School</Form.Label>
                    <Form.Control
                      value={studentDetail.highSchool || ""}
                      disabled
                      readOnly
                    />
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Date Admission</Form.Label>
                    <Form.Control
                      value={toDateOnly(studentDetail.dateAdmission)}
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Date Graduated</Form.Label>
                    <Form.Control
                      value={toDateOnly(studentDetail.dateGraduated)}
                      disabled
                      readOnly
                    />
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
                      disabled
                      readOnly
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Honor</Form.Label>
                    <Form.Control value={studentDetail.honor || ""} disabled readOnly />
                  </Col>
                </Row>
              </Col>

              <Col md={4}>
                <div
                  className="border rounded d-flex flex-column align-items-center justify-content-center p-3"
                  style={{ minHeight: 260 }}
                >
                  {studentDetail.photoUrl ? (
                    <img
                      src={studentDetail.photoUrl}
                      alt="Profile"
                      style={{
                        width: 180,
                        height: 180,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #eee",
                      }}
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
          <Button variant="secondary" onClick={closeView}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Flow modals */}
      <ConfirmCreateModal
        show={showConfirm}
        items={confirmItems}
        vcTypeLabel={vcTypeLabel}
        onHide={onConfirmClose}
      />

      <SingleSuccessModal
        show={showSingleSuccess}
        onHide={() => setShowSingleSuccess(false)}
        item={singleSuccessItem}
        onViewTx={() => {
          setTxNoToShow(getTxFromItem(singleSuccessItem));
          setShowTx(true);
        }}
      />

      <BatchSuccessModal
        show={showBatchSuccess}
        onHide={() => setShowBatchSuccess(false)}
        items={batchSuccessItems}
        onViewRowTx={(tx) => {
          setTxNoToShow(tx || "");
          setShowTx(true);
        }}
      />

      <DuplicateErrorModal
        show={showDuplicateError}
        duplicates={dupNames}
        onHide={onDuplicateClose}
      />

      <TxViewerModal show={showTx} txNo={txNoToShow} onHide={() => setShowTx(false)} />
    </section>
  );
}

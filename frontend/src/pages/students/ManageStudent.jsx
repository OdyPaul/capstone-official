// src/pages/accounts/ManageStudentsCreate.jsx
// NOTE: This page is for TESTING ONLY (manual seed of students).
// ONLY superadmin and developer should submit this form.

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
  InputGroup,
  ListGroup,
  Modal,
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaArrowLeft,
  FaSearch,
  FaCheckCircle,
} from "react-icons/fa";
import { createStudent, searchPrograms } from "../../features/student/studentSlice";

const GENDER_OPTIONS = ["", "male", "female", "other"];

export default function ManageStudentsCreate() {
  const dispatch = useDispatch();
  const {
    isCreating,
    createdStudent,
    isError,
    message,
    programResults,
    isSearchingPrograms,
  } = useSelector((s) => s.student);
  const currentUser = useSelector((s) => s.auth.user);

  const canCreate =
    currentUser?.role === "superadmin" || currentUser?.role === "developer";

  // Names -> hidden fullName
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");

  // Structured address -> hidden address
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [cityTown, setCityTown] = useState("");
  const [province, setProvince] = useState("");

  // Form payload (fullName, address, curriculumId are hidden/computed)
  const [form, setForm] = useState({
    fullName: "",
    studentNumber: "",
    program: "",
    major: "",
    curriculumId: "", // 👈 hidden; set from selected program._id
    gender: "",
    address: "",
    placeOfBirth: "",
    highSchool: "",
    dateOfBirth: "",
    graduationYear: "",
    photoDataUrl: "",
  });

  const [randomizeMissing, setRandomizeMissing] = useState(false);

  // photo preview
  const [imgPreview, setImgPreview] = useState("");
  const fileInputRef = useRef(null);

  // program dropdown
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const programSearchTimer = useRef(null);
  const programBoxRef = useRef(null);

  const [localMsg, setLocalMsg] = useState("");

  // success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Compose hidden fullName (First + MI + Last)
  useEffect(() => {
    const composed = [firstName.trim(), middleInitial.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
    setForm((prev) => ({ ...prev, fullName: composed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, middleInitial, lastName]);

  // Compose hidden address
  useEffect(() => {
    const composed = [street, barangay, cityTown, province]
      .map((v) => v.trim())
      .filter(Boolean)
      .join(", ");
    setForm((prev) => ({ ...prev, address: composed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street, barangay, cityTown, province]);

  // Debounce program search via Redux thunk
  useEffect(() => {
    const q = (form.program || "").trim();
    if (programSearchTimer.current) clearTimeout(programSearchTimer.current);
    if (q.length < 2) {
      setShowProgramDropdown(false);
      return;
    }
    programSearchTimer.current = setTimeout(() => {
      dispatch(searchPrograms({ q, limit: 12 }));
      setShowProgramDropdown(true);
    }, 250);
    return () =>
      programSearchTimer.current && clearTimeout(programSearchTimer.current);
  }, [dispatch, form.program]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!programBoxRef.current) return;
      if (!programBoxRef.current.contains(e.target))
        setShowProgramDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Open success modal when a student is created
  useEffect(() => {
    if (createdStudent) {
      setShowSuccessModal(true);
    }
  }, [createdStudent]);

  const onPickImage = () => fileInputRef.current?.click();
  const onImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!window.confirm(`Use "${f.name}" as student photo?`)) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setImgPreview(dataUrl);
      setForm((prev) => ({ ...prev, photoDataUrl: String(dataUrl) }));
    };
    reader.readAsDataURL(f);
  };

  const chooseProgram = (p) => {
    const label = p?.program || p?.name || p?.code || p?.title || "";
    setForm((prev) => ({
      ...prev,
      program: label,
      curriculumId: p?._id || p?.id || "",
    }));
    setShowProgramDropdown(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalMsg("");

    if (!canCreate) {
      setLocalMsg("Only superadmin/developer can create students.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setLocalMsg("Please enter first name and last name.");
      return;
    }

    const payload = {
      ...form,
      randomizeMissing,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      middleName: middleInitial.trim() || undefined,
    };

    // Strip empty strings/undefined
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) delete payload[k];
    });

    try {
      await dispatch(createStudent(payload)).unwrap();
      setLocalMsg("Student created successfully.");

      // reset (keep randomize)
      setFirstName("");
      setMiddleInitial("");
      setLastName("");
      setStreet("");
      setBarangay("");
      setCityTown("");
      setProvince("");
      setForm({
        fullName: "",
        studentNumber: "",
        program: "",
        major: "",
        curriculumId: "",
        gender: "",
        address: "",
        placeOfBirth: "",
        highSchool: "",
        dateOfBirth: "",
        graduationYear: "",
        photoDataUrl: "",
      });
      setImgPreview("");
      setShowProgramDropdown(false);
    } catch (err) {
      setLocalMsg(err || "Failed to create student.");
    }
  };

  return (
    <section className="container py-4">
      <Alert variant="warning" className="mb-3">
        <strong>TESTING ONLY:</strong> This tool creates synthetic student records for
        development/testing.
      </Alert>

      {/* Success Modal */}
      <Modal
        show={showSuccessModal}
        onHide={() => setShowSuccessModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaCheckCircle className="text-success" />
            Student Created
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createdStudent?.fullName ? (
            <>
              Student <strong>{createdStudent.fullName}</strong> has been created successfully.
            </>
          ) : (
            "Student has been created successfully."
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => setShowSuccessModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      <Card className="mb-4">
        <Card.Header className="bg-light">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <strong>Create Student</strong>
              <span className="badge bg-warning text-dark">TESTING ONLY</span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Form.Check
                type="switch"
                id="randomize-missing"
                label="Randomize missing fields (testing)"
                checked={randomizeMissing}
                onChange={(e) => setRandomizeMissing(e.target.checked)}
              />
              <Button
                as={NavLink}
                to="/students/student-profiles"
                end
                variant="secondary"
                size="sm"
                className="d-flex align-items-center"
                style={{ textDecoration: "none" }}
              >
                <FaArrowLeft className="me-2" />
                Back to Student Profiles
              </Button>
            </div>
          </div>
        </Card.Header>

        <Card.Body>
          {!canCreate && (
            <Alert variant="danger">
              Only <strong>superadmin</strong> and <strong>developer</strong> can create students.
            </Alert>
          )}

          {(localMsg || message) && (
            <Alert variant={isError ? "danger" : "info"} className="mb-3">
              {localMsg || message}
            </Alert>
          )}

          {createdStudent && (
            <Alert variant="success" className="mb-3">
              Created: <strong>{createdStudent.fullName}</strong>
            </Alert>
          )}

          <Form onSubmit={onSubmit}>
            <Row>
              {/* LEFT: form fields */}
              <Col md={8}>
                {/* Names */}
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>First Name *</Form.Label>
                    <Form.Control
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g., Juan"
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Middle Initial</Form.Label>
                    <Form.Control
                      value={middleInitial}
                      onChange={(e) => setMiddleInitial(e.target.value)}
                      placeholder="e.g., A."
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Last Name *</Form.Label>
                    <Form.Control
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g., Dela Cruz"
                    />
                  </Col>
                </Row>

                {/* Hidden full name */}
                <input type="hidden" value={form.fullName} readOnly aria-hidden="true" />

                {/* Student Number + Program/Major */}
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Label>Student Number</Form.Label>
                    <Form.Control
                      value={form.studentNumber}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          studentNumber: e.target.value,
                        })
                      }
                      placeholder="Leave blank to auto-generate"
                    />
                  </Col>

                  {/* Program with Redux-backed search */}
                  <Col md={4} ref={programBoxRef} style={{ position: "relative" }}>
                    <Form.Label>Program</Form.Label>
                    <InputGroup>
                      <Form.Control
                        value={form.program}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            program: e.target.value,
                            curriculumId: "",
                          }))
                        }
                        placeholder="e.g., BSIT, BSED ENGLISH"
                        onFocus={() => {
                          if ((form.program || "").trim().length >= 2)
                            setShowProgramDropdown(true);
                        }}
                      />
                      <InputGroup.Text>
                        {isSearchingPrograms ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaSearch />
                        )}
                      </InputGroup.Text>
                    </InputGroup>

                    {/* Suggestions */}
                    {showProgramDropdown && (
                      <div
                        className="shadow border bg-white rounded mt-1"
                        style={{
                          position: "absolute",
                          zIndex: 10,
                          width: "100%",
                          maxHeight: 260,
                          overflowY: "auto",
                        }}
                      >
                        {programResults.length ? (
                          <ListGroup variant="flush">
                            {programResults.map((p) => {
                              const key = p._id || p.id || p.program || Math.random();
                              const label =
                                p.program ||
                                p.name ||
                                p.code ||
                                p.title ||
                                "(unnamed program)";
                              const sub = p.curriculumYear
                                ? `Curriculum ${p.curriculumYear}`
                                : null;
                              return (
                                <ListGroup.Item
                                  key={key}
                                  action
                                  onMouseDown={(e) => e.preventDefault()} // keep focus
                                  onClick={() => chooseProgram(p)}
                                >
                                  <div className="fw-semibold">{label}</div>
                                  {sub ? (
                                    <div className="small text-muted">{sub}</div>
                                  ) : null}
                                </ListGroup.Item>
                              );
                            })}
                          </ListGroup>
                        ) : (
                          <div className="p-2 text-muted small">No matches</div>
                        )}
                      </div>
                    )}

                    {/* Hidden curriculumId tied to selected program */}
                    <input
                      type="hidden"
                      value={form.curriculumId}
                      readOnly
                      aria-hidden="true"
                    />
                  </Col>

                  <Col md={4}>
                    <Form.Label>Major</Form.Label>
                    <Form.Control
                      value={form.major}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          major: e.target.value,
                        })
                      }
                      placeholder="optional"
                    />
                  </Col>
                </Row>

                {/* Gender */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Select
                      value={form.gender}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gender: e.target.value,
                        })
                      }
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g || "empty"} value={g}>
                          {g || "(unspecified)"}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>

                {/* Address (structured -> hidden composed string) */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Street</Form.Label>
                    <Form.Control
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g., 123 Mabini St."
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Barangay</Form.Label>
                    <Form.Control
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      placeholder="e.g., Brgy. 23-B"
                    />
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>City/Town</Form.Label>
                    <Form.Control
                      value={cityTown}
                      onChange={(e) => setCityTown(e.target.value)}
                      placeholder="e.g., Davao City"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Province</Form.Label>
                    <Form.Control
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="e.g., Davao del Sur"
                    />
                  </Col>
                </Row>
                <input
                  type="hidden"
                  value={form.address}
                  readOnly
                  aria-hidden="true"
                />

                {/* Place of Birth + High School */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Place of Birth</Form.Label>
                    <Form.Control
                      value={form.placeOfBirth}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          placeOfBirth: e.target.value,
                        })
                      }
                      placeholder="City, Province"
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>High School</Form.Label>
                    <Form.Control
                      value={form.highSchool}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          highSchool: e.target.value,
                        })
                      }
                      placeholder="e.g., Davao City HS"
                    />
                  </Col>
                </Row>

                {/* Date of Birth */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                  </Col>
                </Row>

                {/* Graduation Year */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Graduation Year</Form.Label>
                    <Form.Control
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder="e.g., 2024"
                      value={form.graduationYear}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          graduationYear: e.target.value,
                        })
                      }
                    />
                  </Col>
                </Row>

                <div className="mt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreating || !canCreate}
                  >
                    {isCreating ? (
                      <Spinner animation="border" size="sm" className="me-2" />
                    ) : null}
                    Create Student
                  </Button>
                </div>
              </Col>

              {/* RIGHT: photo */}
              <Col md={4}>
                <div
                  className="border rounded d-flex flex-column align-items-center justify-content-center p-3"
                  style={{ minHeight: 260 }}
                >
                  {imgPreview ? (
                    <>
                      <img
                        src={imgPreview}
                        alt="Photo"
                        style={{
                          width: 180,
                          height: 180,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #eee",
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="mt-3"
                        onClick={onPickImage}
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
                        onClick={onPickImage}
                      >
                        <FaPlus className="me-2" /> Add Photo
                      </Button>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={onImageChange}
                  />
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    </section>
  );
}

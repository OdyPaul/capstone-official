import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import {
  getTemplates,
  createTemplate,
  selectTemplates,
  selectTemplateState,
  resetTemplate,
} from "../../../features/template/templateSlice";
import templateService from "../../../features/template/templateService";
import {
  Button,
  Modal,
  Form,
  Table,
  Spinner,
  Alert,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import { FaEye, FaArrowLeft } from "react-icons/fa";
import {
  FiCreditCard,
  FiUser,
  FiMail,
  FiCalendar,
  FiHash,
  FiList,
  FiTag,
} from "react-icons/fi";


/* ---------- helpers ---------- */
const slugify = (s = "") =>
  s
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);

/**
 * Default attributes seeded from Student_Profiles.
 * Minimal: key, title, type, required, path, description
 */
const DEFAULT_ATTRIBUTES = [
  {
    key: "studentId",
    title: "Subject ID",
    type: "string",
    required: true,
    path: "studentNumber",
    description: "Student or subject identifier.",
  },
  {
    key: "subjectName",
    title: "Subject Name",
    type: "string",
    required: true,
    path: "fullName",
    description: "Full name of the student.",
  },
  {
    key: "program",
    title: "Program",
    type: "string",
    required: true,
    path: "program",
    description: "Degree program (e.g., BSIT).",
  },
  {
    key: "graduationDate",
    title: "Graduation Date",
    type: "date",
    required: false,
    path: "dateGraduated",
    description: "Date of graduation, if applicable.",
  },
  {
    key: "gwa",
    title: "GWA",
    type: "number",
    required: false,
    path: "gwa",
    description: "General Weighted Average.",
  },
  {
    key: "subjects",
    title: "Subjects (TOR rows)",
    type: "array",
    required: true,
    path: "subjects",
    description: "Array of course records (code, title, units, grade, remarks).",
  },
];

/* Icon mapping for the attribute list */
function AttrIcon({ attr }) {
  const t = (attr?.title || attr?.key || "").toLowerCase();
  const k = (attr?.key || "").toLowerCase();
  const type = attr?.type;

  if (k.includes("id") || t.includes("id")) return <FiCreditCard />;
  if (t.includes("name")) return <FiUser />;
  if (t.includes("email")) return <FiMail />;
  if (type === "date" || t.includes("date")) return <FiCalendar />;
  if (type === "number" || ["gpa", "gwa", "units", "grade"].some(x => k.includes(x) || t.includes(x))) return <FiHash />;
  if (type === "array" || ["subjects", "courses", "list"].some(x => k.includes(x) || t.includes(x))) return <FiList />;
  return <FiTag />;
}


export default function Template() {
  const dispatch = useDispatch();
  const items = useSelector(selectTemplates);
  const state = useSelector(selectTemplateState);
  const token = useSelector((s) => s.auth?.user?.token);
  const { isLoadingList, isLoadingCreate, isError, message } = state;

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [seedDefaults, setSeedDefaults] = useState(true);

  // schema modal (viewer only)
  const [showSchema, setShowSchema] = useState(false);
  
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schema, setSchema] = useState(null); // { name, slug, version, lastUpdated, attributes: [] }

  useEffect(() => {
    dispatch(getTemplates({}));
    return () => {
      dispatch(resetTemplate());
    };
  }, [dispatch]);

  useEffect(() => {
    setSlug(slugify(name));
  }, [name]);

  const onCreate = async (e) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      version: version.trim() || "1.0.0",
      attributes: seedDefaults ? DEFAULT_ATTRIBUTES : [],
    };

    const res = await dispatch(createTemplate(payload));
    if (res.meta.requestStatus === "fulfilled") {
      setShowCreate(false);
      setName("");
      setSlug("");
      setDescription("");
      setVersion("1.0.0");
      setSeedDefaults(true);
    }
  };

  const isEmpty = useMemo(
    () => !isLoadingList && (!items || items.length === 0),
    [isLoadingList, items]
  );

  const openSchema = async (tplId) => {
    setShowSchema(true);
    setSchema(null);
    setSchemaLoading(true);
    try {
      const data = await templateService.getTemplatePreview(tplId, token); // GET /:id/preview
      const attrs = Array.isArray(data?.attributes) ? data.attributes : [];
      const sorted = [...attrs].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );
      setSchema({ ...data, attributes: sorted });
    } catch (e) {
      setSchema({
        error:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load template schema.",
      });
    } finally {
      setSchemaLoading(false);
    }
  };

  return (
    <section className="container py-4">
      {/* Header with Back + Title + New */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          {/* CHANGE the `to` path if your Draft route differs */}
          <Button as={NavLink} to="/vc/draft" variant="outline-secondary">
            <FaArrowLeft className="me-2" />
            Back to Drafts
          </Button>
        </div>
        <h1 className="h3 mb-0">Templates</h1>
        <Button onClick={() => setShowCreate(true)} variant="primary">
          + New Template
        </Button>
      </div>

      {isError && (
        <Alert variant="danger" className="mb-3">
          {message || "Something went wrong."}
        </Alert>
      )}

      {isLoadingList ? (
        <div className="py-5 text-center">
          <Spinner animation="border" role="status" />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-5 border rounded">
          <div className="h5 mb-2">No template is available.</div>
          <p className="text-muted mb-3">
            Create your first template to start issuing credentials.
          </p>
          <Button onClick={() => setShowCreate(true)} variant="primary">
            + New Template
          </Button>
        </div>
      ) : (
        <div className="table-responsive">
          <Table hover className="align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ minWidth: 220 }}>Name</th>
                <th>Slug</th>
                <th>Version</th>
                <th>Last Updated</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t._id || t.id}>
                  <td className="fw-semibold">{t.name}</td>
                  <td><code>{t.slug}</code></td>
                  <td>{t.version}</td>
                  <td>
                    {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "—"}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => openSchema(t._id || t.id)}
                      aria-label="View template schema"
                      title="View template schema"
                    >
                      <FaEye />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Create Template Modal */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)} backdrop="static" centered>
        <Form onSubmit={onCreate}>
          <Modal.Header closeButton>
            <Modal.Title>New Template</Modal.Title>
          </Modal.Header>
        <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. University Transcript (TOR)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Slug (auto)</Form.Label>
                <Form.Control type="text" value={slug} readOnly />
                <Form.Text className="text-muted">
                  Generated from name. Used in URLs and identifiers.
                </Form.Text>
              </Col>
              <Col xs={12}>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>Version</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </Col>

              <Col xs={12}>
                <Form.Check
                  type="checkbox"
                  id="seed-defaults"
                  label="Seed with common Student fields (recommended)"
                  checked={seedDefaults}
                  onChange={(e) => setSeedDefaults(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  This will add fields like Subject ID, Subject Name, Program, Graduation Date, GWA, and Subjects.
                </Form.Text>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoadingCreate}>
              {isLoadingCreate ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Saving…
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Schema Viewer Modal (LIST style like your Image 1) */}
      <Modal
        show={showSchema}
        onHide={() => setShowSchema(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>{schema?.name || "Template"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {schemaLoading ? (
            <div className="py-4 text-center">
              <Spinner animation="border" />
            </div>
          ) : schema?.error ? (
            <Alert variant="danger" className="mb-0">{schema.error}</Alert>
          ) : Array.isArray(schema?.attributes) && schema.attributes.length > 0 ? (
            <div className="px-1">
              <div className="text-uppercase small fw-bold text-muted mb-3">
                Attributes
              </div>

              <div className="border rounded">
                {schema.attributes.map((a, idx) => (
                  <div
                    key={`${a.key}-${idx}`}
                    className={`d-flex align-items-start p-3 ${idx < schema.attributes.length - 1 ? "border-bottom" : ""}`}
                  >
                    <div className="me-3 mt-1 text-muted fs-5">
                      <AttrIcon attr={a} />
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{a.title || a.key}</div>
                      <div className="text-muted small">
                        {a.description || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 border rounded">
              <div className="h6 mb-2">No attributes defined for this template.</div>
              <p className="text-muted mb-0">
                Create a template with default fields, or update this template via PUT to <code>/api/web/template/:id</code>.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSchema(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

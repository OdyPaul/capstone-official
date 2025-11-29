import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
} from "react-bootstrap";
import { FaSync, FaEye } from "react-icons/fa";
import { getAllRequests } from "../../features/request/requestsSlice";

const PAGE_SIZES = [10, 20, 50, 100];

function Request() {
  const dispatch = useDispatch();

  const {
    items = [],
    isLoading = false,
    isError = false,
    message = "",
  } = useSelector((s) => s.requests || {});

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    dispatch(getAllRequests({}));
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return (items || []).filter((r) => r.status === statusFilter);
  }, [items, statusFilter]);

  const shortId = (v) => {
    const s = String(v || "");
    return s.length > 8 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s || "—";
  };

  const statusVariant = (s) =>
    s === "pending"
      ? "warning"
      : s === "approved"
      ? "success"
      : s === "rejected"
      ? "danger"
      : s === "issued"
      ? "info"
      : "secondary";

  const total = filtered.length;
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(0, total) / Math.max(1, limit))
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  useEffect(() => {
    const pc = Math.max(
      1,
      Math.ceil(Math.max(0, total) / Math.max(1, limit))
    );
    if (page > pc) setPage(pc);
  }, [total, limit, page]);

  const openDetails = (request) => {
    setDetailsRequest(request);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setDetailsRequest(null);
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">VC Requests</h1>
        <div className="d-flex gap-2">
          <select
            className="form-select"
            style={{ width: 220 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // reset to first page when filter changes
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="issued">issued</option>
          </select>
          <Button
            variant="outline-primary"
            onClick={() => dispatch(getAllRequests({}))}
          >
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {isError ? <Alert variant="danger">{String(message)}</Alert> : null}

      <Card>
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <strong>Requests</strong>
          <Badge bg="secondary">{total}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student ID</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : pageRows.length ? (
                  pageRows.map((r) => (
                    <tr key={r._id}>
                      <td>
                        {r.profileId ? shortId(r.profileId) : "—"}
                      </td>
                      <td>{r.program || "—"}</td>
                      <td>
                        <Badge bg="dark">
                          {r.vcType || String(r.type || "").toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={statusVariant(r.status || "pending")}>
                          {r.status || "pending"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openDetails(r)}
                        >
                          <FaEye /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Details Modal */}
      <Modal show={showDetails} onHide={closeDetails} centered>
        <Modal.Header closeButton>
          <Modal.Title>Request Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailsRequest ? (
            <>
              {/* Profile Information */}
              <div className="mb-2">
                <div className="text-muted small">Profile</div>
                <div className="d-flex align-items-center gap-2">
                  {detailsRequest.photoUrl ? (
                    <img
                      src={detailsRequest.photoUrl}
                      alt="Profile"
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: "50%",
                        cursor: "pointer",
                      }}
                      onClick={() => handleImageClick(detailsRequest.photoUrl)} // Click to enlarge
                    />
                  ) : (
                    <div className="text-muted small">—</div>
                  )}
                  <div>
                    <div className="fw-semibold">{detailsRequest.fullName || "—"}</div>
                    <div className="small text-muted">
                      {detailsRequest.studentNumber || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div className="mb-2">
                <div className="text-muted small">Student ID</div>
                <div className="fw-semibold">{detailsRequest.profileId || "—"}</div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Program</div>
                <div className="fw-semibold">{detailsRequest.program || "—"}</div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Type</div>
                <div className="fw-semibold">
                  {detailsRequest.vcType || String(detailsRequest.type || "").toUpperCase() || "—"}
                </div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Purpose</div>
                <div className="fw-semibold">{detailsRequest.vcPurpose || detailsRequest.purpose || "—"}</div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Anchor now</div>
                <div className="fw-semibold">
                  {detailsRequest.anchorNow ? "Yes" : "No"}
                </div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Draft</div>
                <div className="fw-semibold">
                  {detailsRequest.draft ? shortId(detailsRequest.draft) : "None"}
                </div>
              </div>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeDetails}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Modal */}
      <Modal
        show={showImageModal}
        onHide={closeImageModal}
        centered
        size="lg"
        aria-labelledby="image-modal-label"
      >
        <Modal.Body
          style={{
            textAlign: "center",
            backgroundColor: "black",
          }}
        >
          <img
            src={selectedImage}
            alt="Enlarged profile"
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
            onClick={closeImageModal} // Close when clicked outside
          />
        </Modal.Body>
      </Modal>
    </section>
  );
}

export default Request;

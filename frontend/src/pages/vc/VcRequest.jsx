import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../../../config";
import { Modal, Button, Spinner, Table } from "react-bootstrap";
import { useSelector } from "react-redux";

function AdminVCRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState({ face: "", id: "" });

  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user?.token) return;

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/vc-requests`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setRequests(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to fetch requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  // ✅ Open modal using URLs from backend
const handleViewImages = (request) => {
  setSelectedImages({
    face: request.faceImageUrl,
    id: request.validIdImageUrl,
  });
  setShowModal(true);
};

  return (
    <div className="container mt-4">
      <h1>All VC Requests</h1>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p>Loading requests...</p>
        </div>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : requests.length === 0 ? (
        <p>No VC requests found.</p>
      ) : (
        <Table bordered responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Type</th>
              <th>Course</th>
              <th>Year Graduated</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, idx) => (
              <tr key={req._id}>
                <td>{idx + 1}</td>
                <td>{req.student?.name || "N/A"}</td>
                <td>{req.type}</td>
                <td>{req.course}</td>
                <td>{req.yearGraduated || "-"}</td>
                <td>{req.status}</td>
                <td>{new Date(req.createdAt).toLocaleString()}</td>
                <td>
                  <Button size="sm" onClick={() => handleViewImages(req)}>
                    View Images
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Uploaded Images</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex justify-content-around flex-wrap">
          {selectedImages.face && (
            <div className="mb-3">
              <p>Face Image:</p>
              <img
                src={selectedImages.face}
                alt="Face"
                style={{ maxHeight: "300px" }}
                className="img-fluid"
              />
            </div>
          )}
          {selectedImages.id && (
            <div className="mb-3">
              <p>Valid ID:</p>
              <img
                src={selectedImages.id}
                alt="Valid ID"
                style={{ maxHeight: "300px" }}
                className="img-fluid"
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminVCRequests;

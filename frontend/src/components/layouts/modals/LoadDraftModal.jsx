import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

function LoadDraftModal({ show, onClose, onConfirm }) {
  // 🔹 Filters
  const [filters, setFilters] = useState({
    credentialType: "All",
    dateRange: "All",
  });

  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    const query = {};

    if (filters.credentialType !== "All") {
      query.type = filters.credentialType;
    }
    if (filters.dateRange !== "All") {
      query.range = filters.dateRange; // backend parses this
    }

    onConfirm(query);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Load Drafts</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Credential Type */}
        <div className="mb-3">
          <label className="form-label">Credential Type</label>
          <select
            className="form-select"
            value={filters.credentialType}
            onChange={(e) => handleChange("credentialType", e.target.value)}
          >
            <option value="All">All</option>
            <option value="Degree">Degree</option>
            <option value="TOR">Transcript of Records</option>
          </select>
        </div>

        {/* Draft Created Range */}
        <div className="mb-3">
          <label className="form-label">Draft Created</label>
          <select
            className="form-select"
            value={filters.dateRange}
            onChange={(e) => handleChange("dateRange", e.target.value)}
          >
            <option value="All">All</option>
            <option value="today">Today</option>
            <option value="1w">Past Week</option>
            <option value="1m">Past Month</option>
            <option value="6m">Past 6 Months</option>
          </select>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Load
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default LoadDraftModal;

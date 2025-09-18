import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { BsCalendar } from "react-icons/bs";

function CreateVCConfirmModal({ show, count, students, onClose }) {
  const [rows, setRows] = useState([]);

  // Helper: compute expiration based on duration string
  const addDuration = (duration) => {
    const now = new Date();
    if (duration === "90d") now.setDate(now.getDate() + 90);
    if (duration === "180d") now.setDate(now.getDate() + 180);
    if (duration === "1y") now.setFullYear(now.getFullYear() + 1);
    if (duration === "2y") now.setFullYear(now.getFullYear() + 2);
    return now;
  };

  // Reset rows whenever students change
  useEffect(() => {
    if (students?.length > 0) {
      setRows(
        students.map((s) => ({
          studentId: s._id,
          studentName: s.fullName,
          program: s.program,
          type: "TOR",
          expiration: "90d", // default 90 days
          customDate: null,
          purpose: "employment",
        }))
      );
    } else {
      setRows([]);
    }
  }, [students]);

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    // Reset customDate if expiration is not "custom"
    if (field === "expiration" && value !== "custom") {
      updated[index].customDate = null;
    }

    setRows(updated);
  };

  const handleSubmit = async () => {
    try {
      for (const row of rows) {
        let expDate;
        if (row.expiration === "custom" && row.customDate) {
          expDate = new Date(row.customDate);
        } else {
          expDate = addDuration(row.expiration);
        }

        if (!expDate || isNaN(expDate.getTime())) {
          throw new Error(`Invalid expiration date for ${row.studentName}`);
        }

        await axios.post("/api/vc/draft", {
          studentId: row.studentId,  // ← must match backend
          type: row.type,
          purpose: row.purpose,
          expiration: expDate.toISOString(),
        });
      }

      alert("All VC drafts created successfully ✅");
      onClose();
    } catch (err) {
      console.error("Error creating VC drafts:", err);
      alert("Something went wrong ❌ Check console for details.");
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Create {count} VC(s)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Program</th>
                <th>Type</th>
                <th>Expiration</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">
                    No students selected.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.studentName}</td>
                    <td>{r.program}</td>
                    <td>
                      <select
                        value={r.type}
                        onChange={(e) => handleChange(i, "type", e.target.value)}
                        className="form-select"
                      >
                        <option value="TOR">TOR</option>
                        <option value="Degree">Degree</option>
                        <option value="Diploma">Diploma</option>
                      </select>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <select
                          value={r.expiration}
                          onChange={(e) => handleChange(i, "expiration", e.target.value)}
                          className="form-select me-2"
                        >
                          <option value="90d">90 days</option>
                          <option value="180d">6 months</option>
                          <option value="1y">1 year</option>
                          <option value="2y">2 years</option>
                          <option value="custom">Custom</option>
                        </select>

                        {r.expiration === "custom" && (
                          <div className="d-flex align-items-center">
                            <DatePicker
                              selected={r.customDate ? new Date(r.customDate) : null}
                              onChange={(date) => handleChange(i, "customDate", date)}
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select a date"
                              className="form-control"
                            />
                            <BsCalendar
                              className="ms-2 text-primary"
                              size={20}
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                const input = e.currentTarget
                                  .closest("td")
                                  .querySelector("input.react-datepicker-ignore-onclickoutside");
                                input?.focus();
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        value={r.purpose}
                        onChange={(e) => handleChange(i, "purpose", e.target.value)}
                        className="form-select"
                      >
                        <option value="employment">Employment</option>
                        <option value="board exam">Board Exam</option>
                        <option value="transfer">Transfer</option>
                        <option value="government">Government Requirement</option>
                        <option value="international">International</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleSubmit}>
          Confirm & Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CreateVCConfirmModal;

import React, { useEffect } from "react";

function DegreeModal({ show, draft, student, loading, onClose }) {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden"; // 🔒 lock background scroll
    }
    return () => {
      document.body.style.overflow = "auto"; // ✅ restore on close
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog">
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        role="document"
      >
        <div className="modal-content" style={{ maxHeight: "80vh" }}>
          <div className="modal-header bg-success text-dark">
            <h5 className="modal-title">
              {draft?.type || "Degree"} Credential – {student?.fullName || "N/A"}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          {/* 🔽 Fix height + scrollable body */}
          <div
            className="modal-body"
            style={{ overflowY: "auto", maxHeight: "65vh" }}
          >
            {loading ? (
              <div className="d-flex flex-column align-items-center py-5">
                <div className="spinner-border text-primary mb-3" role="status" />
                <p>Loading credential details...</p>
              </div>
            ) : draft && student ? (
              <div className="container">
                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Student Number:</div>
                  <div className="col-sm-8">{student.studentNumber || "N/A"}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Full Name:</div>
                  <div className="col-sm-8">{student.fullName || "N/A"}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Program:</div>
                  <div className="col-sm-8">{student.program || "N/A"}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Credential Type:</div>
                  <div className="col-sm-8">{draft.type || "N/A"}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Expiration:</div>
                  <div className="col-sm-8">
                    {draft.expiration
                      ? new Date(draft.expiration).toLocaleDateString()
                      : "N/A"}
                  </div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Purpose:</div>
                  <div className="col-sm-8">{draft.purpose || "N/A"}</div>
                </div>
              </div>
            ) : (
              <p>No credential details available.</p>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DegreeModal;

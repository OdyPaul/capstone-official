import React from "react";

function ConfirmModal({ show, student, vcType, onClose, onViewVC, onViewCredential }) {
  if (!show || !student) return null;

  // Decide button text based on VC type
  const credentialText =
    vcType === "tor"
      ? "Transcript of Records (TOR)"
      : vcType === "degree"
      ? "Degree Certificate"
      : "VC (JSON)";
      

  return (
    <div
      className={`modal fade ${show ? "show d-block" : ""}`}
      tabIndex="-1"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">View Options - {student.fullName}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <p>
              Which credential would you like to view?
            </p>
          </div>

          <div className="modal-footer">
            {/* Always allow viewing VC JSON */}
            <button className="btn btn-primary" onClick={onViewVC}>
              View VC (JSON)
            </button>

            {/* Conditional: TOR or Degree based on vcType */}
            {(vcType === "TOR" || vcType === "Degree") && (
              <button className="btn btn-success" onClick={onViewCredential}>
                View {credentialText}
              </button>
            )}

            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

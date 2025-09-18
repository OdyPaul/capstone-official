import React from "react";

function UnselectConfirmModal({ show, count, onClose, onConfirm }) {
  if (!show) return null;

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
            <h5 className="modal-title">Confirm Unselect</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            Are you sure you want to unselect {count} selected student
            {count > 1 ? "s" : ""}?
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-warning" onClick={onConfirm}>
              Unselect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnselectConfirmModal;

function ConfirmModal({ show, student, onClose, onViewVC, onViewTOR }) {
  if (!show || !student) return null;

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
            <h5 className="modal-title">
              View Options - {student.fullName}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Do you want to view the student’s VC (JSON) or the TOR?</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onViewVC}>View VC (JSON)</button>
            <button className="btn btn-success" onClick={onViewTOR}>View TOR</button>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

import Spinner from "../Spinner";

function VcModal({ show, student, vc, loading, onClose }) {
  if (!show || !student) return null;

  return (
    <div
      className={`modal fade ${show ? "show d-block" : ""}`}
      tabIndex="-1"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Verifiable Credential (JSON) – {student.fullName}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {loading ? (
              <Spinner />
            ) : vc ? (
              <pre
                style={{
                  background: "#f4f4f4",
                  padding: "15px",
                  borderRadius: "5px",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(vc, null, 2)}
              </pre>
            ) : (
              <p>No VC data available.</p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VcModal;

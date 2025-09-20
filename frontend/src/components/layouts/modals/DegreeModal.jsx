import Spinner from "../Spinner";
import React from "react";

function DegreeModal({ show, student, loading, onClose }) {
  if (!show || !student) return null;

  // Map program codes to full degree names
  const degreeNameMap = {
    CIVILENG: "BS Civil Engineering",
    COMPENG: "BS Computer Engineering",
    IT: "BS Information Technology",
  };

  const degreeName = degreeNameMap[student.program] || student.program;

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
            <h5 className="modal-title">Degree Certificate – {student.fullName}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {loading ? (
              <Spinner />
            ) : (
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <th>Student ID</th>
                    <td>{student._id}</td>
                  </tr>
                  <tr>
                    <th>Student Number</th>
                    <td>{student.studentNumber}</td>
                  </tr>
                  <tr>
                    <th>Full Name</th>
                    <td>{student.fullName}</td>
                  </tr>
                  <tr>
                    <th>Program</th>
                    <td>{degreeName}</td>
                  </tr>
                  <tr>
                    <th>Date Graduated</th>
                    <td>{student.dateGraduated}</td>
                  </tr>
                  <tr>
                    <th>GWA</th>
                    <td>{student.gwa}</td>
                  </tr>
                  <tr>
                    <th>Honors</th>
                    <td>{student.honor || "—"}</td>
                  </tr>
                </tbody>
              </table>
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

export default DegreeModal;

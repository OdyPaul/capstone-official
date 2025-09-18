import Spinner from "../Spinner";
import React from "react";

function TorModal({ show, student, tor, loading, onClose }) {
  if (!show || !student) return null;

  // Group subjects by year/semester
  const groupedTOR = tor.reduce((acc, subj) => {
    const term = `[${subj.yearLevel} | ${subj.semester}]`;
    if (!acc[term]) acc[term] = [];
    acc[term].push(subj);
    return acc;
  }, {});

  return (
    <div
      className={`modal fade ${show ? "show d-block" : ""}`}
      tabIndex="-1"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Transcript of Records – {student.fullName}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {loading ? (
              <Spinner />
            ) : tor.length > 0 ? (
              <>
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Term</th>
                      <th>Course No.</th>
                      <th>Subject Description</th>
                      <th>Final Grade</th>
                      <th>Remarks</th>
                      <th>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(groupedTOR).map((term, idx) => (
                      <React.Fragment key={idx}>
                        {/* First row of each group prints the term */}
                        {groupedTOR[term].map((subj, i) => (
                          <tr key={`${term}-${i}`}>
                            <td>{i === 0 ? term : ""}</td>
                            <td>{subj.subjectCode}</td>
                            <td>{subj.subjectDescription}</td>
                            <td>{subj.finalGrade}</td>
                            <td>{subj.remarks || "—"}</td>
                            <td>{subj.units}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Grading System */}
                <div className="mt-3">
                  <strong>GRADING SYSTEM:</strong>{" "}
                  1.00–1.25 Excellent; 1.50–1.75 Very Good; 2.00–2.25 Good; 
                  2.50–2.75 Satisfactory; 3.00 Passed; 4.00 Conditional; 
                  Inc – Incomplete; Drp – Dropped; 5.00 Failed/Unofficially Dropped
                </div>
              </>
            ) : (
              <p>No TOR data available.</p>
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

export default TorModal;

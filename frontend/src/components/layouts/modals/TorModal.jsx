import Spinner from "../Spinner";
import React, { useEffect } from "react";

function TorModal({ show, student, draft, tor, loading, onClose }) {
  useEffect(() => {
    if (show) document.body.style.overflow = "hidden"; // lock background
    return () => { document.body.style.overflow = "auto"; }; // restore scroll
  }, [show]);

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
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-centered"
        role="document"
        onClick={(e) => e.stopPropagation()} // prevent backdrop close
      >
        <div className="modal-content" style={{ maxHeight: "85vh" }}>
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">
              Transcript of Records – {student.fullName}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body" style={{ overflowY: "auto", maxHeight: "70vh" }}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                {/* ✅ Student + Credential Info */}
                <div className="container mb-3 small">
            <div className="row mb-1">
              <div className="col-sm-4 fw-bold">Student Number:</div>
              <div className="col-sm-8">{student.studentNumber || "N/A"}</div>
            </div>
            <div className="row mb-1">
              <div className="col-sm-4 fw-bold">Full Name:</div>
              <div className="col-sm-8">{student.fullName || "N/A"}</div>
            </div>
            <div className="row mb-1">
              <div className="col-sm-4 fw-bold">Program:</div>
              <div className="col-sm-8">{student.program || "N/A"}</div>
            </div>
            <div className="row mb-1">
              <div className="col-sm-4 fw-bold">Credential Type:</div>
              <div className="col-sm-8">{draft?.type || "TOR"}</div>
            </div>
            <div className="row mb-1">
              <div className="col-sm-4 fw-bold">Expiration:</div>
              <div className="col-sm-8">
                {draft?.expiration
                  ? new Date(draft.expiration).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-sm-4 fw-bold">Purpose:</div>
              <div className="col-sm-8">{draft?.purpose || "N/A"}</div>
            </div>
          </div>


                {/* ✅ TOR Table */}
                {tor.length > 0 ? (
                  <div className="table-responsive small">
                    <table className="table table-bordered table-hover">
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
                  </div>
                ) : (
                  <p>No TOR data available.</p>
                )}

                {/* Grading System */}
                <div className="mt-3 small">
                  <strong>GRADING SYSTEM:</strong>{" "}
                  1.00–1.25 Excellent; 1.50–1.75 Very Good; 2.00–2.25 Good; 
                  2.50–2.75 Satisfactory; 3.00 Passed; 4.00 Conditional; 
                  Inc – Incomplete; Drp – Dropped; 5.00 Failed/Unofficially Dropped
                </div>
              </>
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

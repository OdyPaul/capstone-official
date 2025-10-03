import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getStudentById } from "../../../features/student/studentSlice";

function StudentInfoModal({ show, student, onClose }) {
  const dispatch = useDispatch();
const { student: studentDetails, isLoadingDetail } = useSelector(
  (state) => state.student
);
  useEffect(() => {
    if (show && student?._id) {
      dispatch(getStudentById(student._id));
      document.body.style.overflow = "hidden"; // 🔒 lock background scroll
    }
    return () => {
      document.body.style.overflow = "auto"; // ✅ restore on close
    };
  }, [show, student, dispatch]);

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog">
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        role="document"
      >
        <div className="modal-content" style={{ maxHeight: "80vh" }}>
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">Student Information</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          {/* 🔽 Fix height + add scroll */}
            <div
            className="modal-body"
            style={{ overflowY: "auto", maxHeight: "65vh" }}
            >
            {isLoadingDetail ? (   // ✅ fixed here
                <div className="d-flex flex-column align-items-center py-5">
                <div className="spinner-border text-primary mb-3" role="status" />
                <p>Loading student info...</p>
                </div>
            ) : studentDetails ? (
              <div className="container">
                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Student Number:</div>
                  <div className="col-sm-8">{studentDetails.studentNumber}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Full Name:</div>
                  <div className="col-sm-8">{studentDetails.fullName}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Gender:</div>
                  <div className="col-sm-8">{studentDetails.gender}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Address:</div>
                  <div className="col-sm-8">{studentDetails.address}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Program:</div>
                  <div className="col-sm-8">{studentDetails.program}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Major:</div>
                  <div className="col-sm-8">{studentDetails.major}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Date of Admission:</div>
                  <div className="col-sm-8">
                    {studentDetails.dateAdmission?.split("T")[0] || ""}
                  </div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Place of Birth:</div>
                  <div className="col-sm-8">{studentDetails.placeOfBirth}</div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">Date Graduated:</div>
                  <div className="col-sm-8">
                    {studentDetails.dateGraduated?.split("T")[0] || ""}
                  </div>
                </div>

                <div className="row mb-2">
                  <div className="col-sm-4 fw-bold">GWA:</div>
                  <div className="col-sm-8">{studentDetails.gwa}</div>
                </div>
              </div>
            ) : (
              <p>No details available.</p>
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

export default StudentInfoModal;

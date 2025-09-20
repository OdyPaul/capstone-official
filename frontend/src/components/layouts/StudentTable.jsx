import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getPassingStudents,
  searchStudents,
  getStudentTor,
  getStudentById,
  reset
} from "../../features/student/studentSlice";

import { FaTimes, FaCog, FaEye, FaSearch } from "react-icons/fa";
import "./css/table.css";
import Spinner from "./Spinner";
import ConfirmModal from "./modals/ConfirmModal";
import TorModal from "./modals/TorModal";
import VcModal from "./modals/VcModal";
import UnselectConfirmModal from "./modals/UnselectConfirmModal";
import CreateVCConfirmModal from "./modals/CreateVCConfirmModal";
import ErrorModal from "./modals/ErrorModal"
import SuccessModal from "./modals/SuccessModal";
import { createDrafts, reset as resetVC } from "../../features/draft_vc/vcSlice";


function StudentTable() {
  const dispatch = useDispatch();

  const {
    students,
    student: vc, // VC data = single student object
    tor,
    isLoading: loading,
    isError,
    message: error,
  } = useSelector((state) => state.student);

  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState("All");
  const [selectedRows, setSelectedRows] = useState([]);

  const [programs, setPrograms] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTORModal, setShowTORModal] = useState(false);
  const [showVCModal, setShowVCModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVCConfirmModal, setShowVCConfirmModal] = useState(false);
const { isLoading: vcLoading, isSuccess: vcSuccess, isError: vcError, message: vcMessage } = useSelector(
  (state) => state.vc
);

useEffect(() => {
  return () => {
    dispatch(resetVC());
  };
}, [dispatch]);


  useEffect(() => {
    dispatch(getPassingStudents());
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

    useEffect(() => {
    // Grab all programs when students first load
    if (students.length > 0 && programs.length === 0) {
        const uniquePrograms = [...new Set(students.map((s) => s.program))];
        setPrograms(uniquePrograms);
    }
    }, [students, programs]);

    useEffect(() => {
  if (isError && error) {
    setErrorMessage(error);
  }
}, [isError, error]);
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 10;
// Calculate the indexes for current page
const indexOfLastRow = currentPage * rowsPerPage;
const indexOfFirstRow = indexOfLastRow - rowsPerPage;
const currentStudents = students.slice(indexOfFirstRow, indexOfLastRow);

// Calculate total pages
const totalPages = Math.ceil(students.length / rowsPerPage);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query) {
      dispatch(getPassingStudents());
    } else {
      dispatch(searchStudents(query));
    }
  };

  const handleApplyProgram = () => {
    if (selectedProgram === "All") {
      dispatch(getPassingStudents());
    } else {
      dispatch(searchStudents(selectedProgram));
    }
  };

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleUnselectSelected = () => {
    setSelectedRows([]);
    setShowDeleteModal(false);
  };

  const handleConfirmView = (student) => {
    setSelectedStudent(student);
    setShowConfirmModal(true);
  };

  const handleViewTOR = () => {
    setShowConfirmModal(false);
    setShowTORModal(true);
    dispatch(getStudentTor(selectedStudent._id));
  };

  const handleViewVC = () => {
    setShowConfirmModal(false);
    setShowVCModal(true);
    dispatch(getStudentById(selectedStudent._id));
  };

const handleSelectAll = () => {
  const currentPageIds = currentStudents.map((s) => s._id);

  const allSelected = currentPageIds.every((id) => selectedRows.includes(id));

  if (allSelected) {
    // Unselect current page
    setSelectedRows((prev) => prev.filter((id) => !currentPageIds.includes(id)));
  } else {
    // Add current page students to selected
    setSelectedRows((prev) => [...new Set([...prev, ...currentPageIds])]);
  }
};

const [successVcs, setSuccessVcs] = useState([]);
const [showSuccessModal, setShowSuccessModal] = useState(false);
  if (loading) return <Spinner />;
  

const handleCreateVC = async (vcDrafts) => {
  const successful = [];
  let hadError = false;

  for (const draft of vcDrafts) {
    try {
      await dispatch(createDrafts(draft)).unwrap();
      console.log("Saved unsigned VC:", draft);
      successful.push(draft);
    } catch (err) {
      console.error("Error saving unsigned VC:", err);
      setErrorMessage(err); // show error modal
      hadError = true;
    }
  }

  setShowVCConfirmModal(false);

  if (successful.length > 0) {
    setSuccessVcs(successful);
    setShowSuccessModal(true);
    setSelectedRows([]);
  }

  if (hadError && successful.length === 0) {
    // ❌ only clear if *all* failed
    setSelectedRows([]);
    setShowDeleteModal(false);
  }
};





// derive selected student objects
const selectedStudents = students.filter((stu) =>
  selectedRows.includes(stu._id)
);



  return (
    <section className="intro">
      <div className="bg-image h-100">
        <div className="mask d-flex align-items-center h-100">
          <div className="container">
            <div className="row justify-content-center">
  <div className="col-12">
    <div
      className="card shadow-2-strong"
      style={{ backgroundColor: "#f5f7fa" }}
    >
      <div className="card-body">
        {/* Top Header Row */}
        <div className="row mb-3 align-items-center">
          <div className="col-md-9">
            <h5 className="mb-0 fw-bold">Available for VC Issuance</h5>
          </div>
          <div className="col-md-3 text-end">
            <button
              type="button"
              className="btn btn-success w-50"
              disabled={selectedRows.length === 0}
              onClick={() => setShowVCConfirmModal(true)}
            >
              Create VC
            </button>
          </div>

        </div>

        {/* Selection + Search Row */}
{/* Selection + Search Row */}
<div className="row mb-3 align-items-center">
  {/* Left side: Selected count + unselect */}
  <div className="col-md-6 d-flex align-items-center">
    <span className="me-2 fw-bold">
      Selected: {selectedRows.length}
    </span>
    <button
      type="button"
      className="btn btn-outline-danger btn-sm"
      onClick={handleUnselectSelected}
      disabled={selectedRows.length === 0}
    >
      <FaTimes className="me-1" /> 
    </button>
  </div>

  {/* Right side: Search input (6 col) + button */}
          <div className="col-md-6">
            <form onSubmit={handleSearch} className="row g-2 justify-content-end">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, student number, or program"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <FaSearch className="me-1" /> Search
                </button>
              </div>
            </form>
          </div>
        </div>


        {/* Filters + Pagination */}
        <div className="row mb-3 align-items-center">
          <div className="col-md-6 d-flex">
            <select
              className="form-select me-2"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              <option value="All">All</option>
              {programs.map((prog) => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={handleApplyProgram}
            >
              Apply
            </button>

            <button
              type="button"
              className="btn btn-outline-dark"
              onClick={handleSelectAll}
            >
              ALL
            </button>
          </div>

          <div className="col-md-6 text-end">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-end mb-0">
                <li className={`page-item ${currentPage === 1 && "disabled"}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  >
                    &laquo;
                  </button>
                </li>

                {Array.from({ length: totalPages }, (_, i) => (
                  <li
                    key={i + 1}
                    className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                  >
                    <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}

                <li className={`page-item ${currentPage === totalPages && "disabled"}`}>
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                  >
                    &raquo;
                  </button>
                </li>
              </ul>
            </nav>

          </div>
        </div>


                    {/* 📊 Students Table */}
                    <div className="table-responsive">
                      <table className="table table-dark table-hover  mb-0">
                        <thead >
                          <tr>
                            <th></th>
                            <th>#</th>
                            <th>Student Number</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>Date Graduated</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentStudents.map((stu, index) => (
                        <tr 
                          key={stu._id}
                          onClick={() => handleRowSelect(stu._id)} // toggle checkbox when row is clicked
                          className={selectedRows.includes(stu._id) ? "selected-row table-success" : "table-light"} // add selected class
                          style={{ cursor: "pointer" }} // show pointer
                        >
                          <td>
                            <div className="form-check">
                              <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedRows.includes(stu._id)}
                              onChange={(e) => {
                                e.stopPropagation(); // ✅ prevent row click from firing twice
                                handleRowSelect(stu._id);
                              }}
                            />
                            </div>
                          </td>
                          <td>{indexOfFirstRow + index + 1}</td>
                          <td>{stu.studentNumber}</td>
                          <td>{stu.fullName}</td>
                          <td>{stu.program}</td>
                          <td>{stu.dateGraduated}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-info btn-sm px-3 me-2"
                              onClick={() => handleConfirmView(stu)}
                            >
                              <FaEye />
                            </button>
                            <button type="button" className="btn btn-primary btn-sm px-3 me-2">
                              <FaCog />
                            </button>
                            <button type="button" className="btn btn-danger btn-sm px-3">
                              <FaTimes />
                            </button>
                          </td>
                        </tr>
                      ))}

                        </tbody>
                      </table>
                      {students.length === 0 && <p>No students found.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={showConfirmModal}
        student={selectedStudent}
        onClose={() => setShowConfirmModal(false)}
        onViewVC={handleViewVC}
        onViewTOR={handleViewTOR}
      />
      
      <TorModal
        show={showTORModal}
        student={selectedStudent}
        tor={tor}
        loading={loading}
        onClose={() => setShowTORModal(false)}
      />

      <VcModal
        show={showVCModal}
        student={selectedStudent}
        vc={vc}
        loading={loading}
        onClose={() => setShowVCModal(false)}
      />

      <UnselectConfirmModal
        show={showDeleteModal}
        count={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleUnselectSelected}
      />

        <CreateVCConfirmModal
          show={showVCConfirmModal}
          count={selectedStudents.length}
          students={selectedStudents}
          onClose={() => setShowVCConfirmModal(false)}
          onConfirm={handleCreateVC}   // ✅ Important
        />

        <ErrorModal
          show={!!errorMessage}
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
        <SuccessModal
        show={showSuccessModal}
        vcs={successVcs}
        onClose={() => setShowSuccessModal(false)}
      />



      </section>

  );
}

export default StudentTable;
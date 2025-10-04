import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getPassingStudents,
  getStudentTor,
  getStudentById,
  reset,
} from "../../features/student/studentSlice";

import {
  FaTimes,
  FaCog,
  FaEye,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import "./css/table.css";

import TorModal from "./modals/TorModal";
import VcModal from "./modals/VcModal";
import UnselectConfirmModal from "./modals/UnselectConfirmModal";
import CreateVCConfirmModal from "./modals/CreateVCConfirmModal";
import ErrorModal from "./modals/ErrorModal";
import SuccessModal from "./modals/SuccessModal";
import LoadStudentModal from "./modals/LoadStudentModal";
import StudentInfoModal from "./modals/StudentInfoModal";
import { createDrafts, reset as resetVC } from "../../features/draft_vc/vcSlice";

function StudentTable() {
  const dispatch = useDispatch();

  const {
    students,
    student: vc,
    tor,
    isLoadingList: loading,
    isError,
    message: error,
  } = useSelector((state) => state.student);



  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState("All");
  const [selectedRows, setSelectedRows] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);



  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVCConfirmModal, setShowVCConfirmModal] = useState(false);
  const [showLoadStudentModal, setShowLoadStudentModal] = useState(false);
  const [showStudentInfoModal, setShowStudentInfoModal] = useState(false);
  const [successVcs, setSuccessVcs] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem("lastStudentFilters");

  if (saved) {
    const lastFilters = JSON.parse(saved);
    if (Object.keys(lastFilters).length > 0) {
      dispatch(getPassingStudents(lastFilters));
    }
  } else {
    // nothing saved → clear students
    dispatch(reset()); // or dispatch an action that clears the student list
  }
}, [dispatch]);





  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentStudents = students.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(students.length / rowsPerPage);

  // Show error messages
  useEffect(() => {
    if (isError && error) {
      setErrorMessage(error);
    }
  }, [isError, error]);
  
  
  // Grab all programs from loaded students
useEffect(() => {
  if (students.length > 0) {
    const uniquePrograms = [...new Set(students.map((s) => s.program))];
    setPrograms(uniquePrograms);
  } else {
    setPrograms([]);
  }
}, [students]);






// Search
const handleSearch = (e) => {
  console.log("Search query:", query);
  e.preventDefault();
  dispatch(
    getPassingStudents({
      ...(selectedProgram !== "All" && { programs: String(selectedProgram) }),
      ...(query && { q: query }),
    })
  
  );
};


// Apply program filter
const handleApplyProgram = () => {
  dispatch(
    getPassingStudents({
      ...(selectedProgram !== "All" && { programs: String(selectedProgram) }),
      ...(query && { q: query }),
    })
  );
};

  

  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((sid) => sid !== id)
        : [...prev, id]
    );
  };

  const handleUnselectSelected = () => {
    setSelectedRows([]);
    setShowDeleteModal(false);
  };

  const handleConfirmView = (student) => {
    setSelectedStudent(student);
    setShowStudentInfoModal(true);
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
    const allSelected = currentPageIds.every((id) =>
      selectedRows.includes(id)
    );

    if (allSelected) {
      setSelectedRows((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    } else {
      setSelectedRows((prev) => [
        ...new Set([...prev, ...currentPageIds]),
      ]);
    }
  };

  const handleCreateVC = async (vcDrafts) => {
    const successful = [];
    let hadError = false;

    for (const draft of vcDrafts) {
      try {
        await dispatch(createDrafts(draft)).unwrap();
        successful.push(draft);
      } catch (err) {
        console.error("Error saving unsigned VC:", err);
        setErrorMessage(err);
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
      setSelectedRows([]);
      setShowDeleteModal(false);
    }
  };

  const selectedStudents = students.filter((stu) =>
    selectedRows.includes(stu._id)
  );


  return (
  <section className="intro mt-3 mb-3">
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
                  
                  {/* 🏷️ Title Row */}
                  <div className="row mb-3">
                    <div className="col-12">
                      <h5 className="mb-0 fw-bold">
                        Available for VC Issuance
                      </h5>
                    </div>
                  </div>

                  {/* 🔝 Top Controls Row */}
                  <div className="row mb-3">
                    <div className="col-12 d-flex align-items-center">
                      <button
                        type="button"
                        className="btn btn-primary me-2"
                        onClick={() => setShowLoadStudentModal(true)}
                      >
                        Load VC
                      </button>

                      <button
                        type="button"
                        className="btn btn-warning me-2"
                        onClick={() => {
                          setSelectedRows([]);
                          setPrograms([]);          // clear local programs state
                          setQuery("");             // clear search box
                          setSelectedProgram("All"); // reset program filter
                          dispatch(reset()); 
                                // clear students & redux state
                                localStorage.removeItem("lastStudentFilters");
                        }}
                      >
                        Reset Table
                      </button>


                      <button
                        type="button"
                        className="btn btn-success me-2"
                        disabled={selectedRows.length === 0}
                        onClick={() => setShowVCConfirmModal(true)}
                      >
                        Create VC
                      </button>
                    </div>
                  </div>

               {/* 🔍 Filters + Search Row */}
            <div className="row mb-3 align-items-center">
              {/* Left side → Search */}
              <div className="col-md-6 d-flex">
                <form onSubmit={handleSearch} className="d-flex w-100">
                  <input
                    type="text"
                    className="form-control me-2"
                    placeholder="Search by name, student number, or program"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                  >
                    <FaSearch className="me-1" /> Search
                  </button>
                </form>
              </div>

              {/* Right side → Filters */}
              <div className="col-md-6 d-flex justify-content-end align-items-center">
                <select
                  className="form-select me-2"
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  style={{ maxWidth: "200px" }}
                >
                  <option value="All">All</option>
                  {programs.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
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
                  className="btn btn-outline-dark me-2"
                  onClick={handleSelectAll}
                >
                  ALL
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger position-relative"
                  onClick={handleUnselectSelected}
                  disabled={selectedRows.length === 0}
                >
                  <FaTrash />
                  {selectedRows.length > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary">
                      {selectedRows.length}
                    </span>
                  )}
                </button>
              </div>
            </div>


                    {/* 📊 Students Table */}
                    <div className="table-responsive">
                      <table className="table table-dark table-hover mb-0">
                        <thead>
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
  {loading ? (
    <tr>
      <td colSpan="7" className="text-center py-4">
        <div className="d-flex flex-column align-items-center">
          <div className="spinner-border text-success mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading students...</span>
        </div>
      </td>
    </tr>
  ) : currentStudents.length > 0 ? (
    currentStudents.map((stu, index) => (
      <tr
        key={stu._id}
        onClick={() => handleRowSelect(stu._id)}
        className={
          selectedRows.includes(stu._id)
            ? "selected-row table-success"
            : "table-light"
        }
        style={{ cursor: "pointer" }}
      >
        <td>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={selectedRows.includes(stu._id)}
              onChange={(e) => {
                e.stopPropagation();
                handleRowSelect(stu._id);
              }}
            />
          </div>
        </td>
        <td>{indexOfFirstRow + index + 1}</td>
        <td>{stu.studentNumber}</td>
        <td>{stu.fullName}</td>
        <td>{stu.program}</td>
        <td>{stu.dateGraduated ? stu.dateGraduated.split("T")[0] : ""}</td>
        <td>
          <button
            type="button"
            className="btn btn-info btn-sm px-3 me-2"
            onClick={() => handleConfirmView(stu)}
          >
            <FaEye />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm px-3 me-2"
          >
            <FaCog />
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm px-3"
          >
            <FaTimes />
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="7" className="text-center py-4">
        No students found.
      </td>
    </tr>
  )}
</tbody>

                      </table>
                    </div>

                    {/* 📑 Pagination Row */}
                    <div className="row mt-3">
                      <div className="col-md-12 d-flex justify-content-end">
                        <nav aria-label="Page navigation">
                          <ul className="pagination mb-0">
                            <li
                              className={`page-item ${
                                currentPage === 1 ? "disabled" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.max(prev - 1, 1)
                                  )
                                }
                              >
                                &laquo;
                              </button>
                            </li>

                            {Array.from(
                              { length: totalPages },
                              (_, i) => (
                                <li
                                  key={i + 1}
                                  className={`page-item ${
                                    currentPage === i + 1
                                      ? "active"
                                      : ""
                                  }`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() =>
                                      setCurrentPage(i + 1)
                                    }
                                  >
                                    {i + 1}
                                  </button>
                                </li>
                              )
                            )}

                            <li
                              className={`page-item ${
                                currentPage === totalPages
                                  ? "disabled"
                                  : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(prev + 1, totalPages)
                                  )
                                }
                              >
                                &raquo;
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  </div>{" "}
                  {/* end card-body */}
                </div>{" "}
                {/* end card */}
              </div>{" "}
              {/* end col */}
            </div>{" "}
            {/* end row */}
          </div>{" "}
          {/* end container */}
        </div>{" "}
        {/* end mask */}
      </div>{" "}
      {/* end bg-image */}

    <StudentInfoModal
      show={showStudentInfoModal}
      student={selectedStudent}
      onClose={() => setShowStudentInfoModal(false)}
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
        onConfirm={handleCreateVC}
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

      <LoadStudentModal
        show={showLoadStudentModal}
        onClose={() => setShowLoadStudentModal(false)}
        onConfirm={(filters) => {
          console.log("🎯 Dispatching with filters:", filters);
          dispatch(getPassingStudents(filters));
          setShowLoadStudentModal(false);
        }}
      />




    </section>
  );
}

export default StudentTable;

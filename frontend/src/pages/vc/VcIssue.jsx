import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaSearch, FaEye, FaTrash } from "react-icons/fa";

import TorModal from "../../components/layouts/modals/TorModal";
import DegreeModal from "../../components/layouts/modals/DegreeModal";
import VcModal from "../../components/layouts/modals/VcModal";
import LoadDraftModal from "../../components/layouts/modals/LoadDraftModal";
import { getStudentTor } from "../../features/student/studentSlice";
import { getDrafts, reset as resetVC, clearDrafts  } from "../../features/draft_vc/vcSlice";

function VcIssue() {
  const dispatch = useDispatch();

  const { tor, student: vc, isLoading: loading } = useSelector(
    (state) => state.student
  );
const { drafts, isLoadingList: draftsLoading } = useSelector(
  (state) => state.vc
);

  // 🔍 Input states
  const [queryInput, setQueryInput] = useState("");   // typing state
  const [appliedQuery, setAppliedQuery] = useState(""); // applied state

  const [programs, setPrograms] = useState([]);
  const [programInput, setProgramInput] = useState("All");   // dropdown selection
  const [appliedProgram, setAppliedProgram] = useState("All"); // applied filter

  // UI states
  const [selectedVC, setSelectedVC] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showVCModal, setShowVCModal] = useState(false);
  const [showLoadDraftModal, setShowLoadDraftsModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

useEffect(() => {
  const lastFilters = localStorage.getItem("lastDraftFilters");
  if (lastFilters) {
    dispatch(getDrafts(JSON.parse(lastFilters)));
  } else {
    // no saved filters → start empty
    dispatch(clearDrafts());
  }
}, [dispatch]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(resetVC());
    };
  }, [dispatch]);

  // Collect programs dynamically
  useEffect(() => {
    if (drafts.length > 0) {
      const uniquePrograms = [...new Set(drafts.map((d) => d.student?.program))];
      setPrograms(uniquePrograms);
    } else {
      setPrograms([]);
    }
  }, [drafts]);

  // --- Filtering + pagination ---
  const filteredVCs = drafts.filter((vc) => {
    const fullName = vc.student?.fullName?.toLowerCase() || "";
    const studentNumber = vc.student?.studentNumber?.toLowerCase() || "";
    const type = vc.type?.toLowerCase() || "";
    const program = vc.student?.program?.toLowerCase() || "";

    return (
      (appliedProgram === "All" ||
        program === appliedProgram.toLowerCase()) &&
      (appliedQuery === "" ||
        fullName.includes(appliedQuery.toLowerCase()) ||
        studentNumber.includes(appliedQuery.toLowerCase()) ||
        type.includes(appliedQuery.toLowerCase()))
    );
  });

  const totalPages = Math.ceil(filteredVCs.length / rowsPerPage);
  const indexOfLastRow = page * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentVCs = filteredVCs.slice(indexOfFirstRow, indexOfLastRow);

  // --- Handlers ---
  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedQuery(queryInput); // apply current search
    setPage(1);
  };

  const handleApplyProgram = () => {
    setAppliedProgram(programInput); // apply current dropdown
    setPage(1);
  };

  const handleView = (vc) => {
    setSelectedVC(vc);
    if (vc.type?.toLowerCase() === "tor") {
      dispatch(getStudentTor(vc.student?._id));
      setShowCredentialModal(true);
    } else if (vc.type?.toLowerCase() === "degree") {
      setShowCredentialModal(true);
    } else {
      setShowVCModal(true);
    }
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
  };

  const handleSelectAll = () => {
    const currentPageIds = currentVCs.map((vc) => vc._id);
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

  return (
    <section className="intro mt-3 mb-3">
      <div className="bg-image h-100">
        <div className="mask d-flex align-items-center h-100">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12">
                <div className="card shadow-2-strong" style={{ backgroundColor: "#f5f7fa" }}>
                  <div className="card-body">

                    {/* 🏷️ Title */}
                    <div className="row mb-3">
                      <div className="col-12">
                        <h5 className="mb-0 fw-bold">Verifiable Credential Issuance</h5>
                      </div>
                    </div>

                    {/* 🔝 Top Controls */}
                      <div className="row mb-3">
                        <div className="col-12 d-flex align-items-center">
                          <button
                            type="button"
                            className="btn btn-primary me-2"
                            onClick={() => setShowLoadDraftsModal(true)}
                          >
                            Load Drafts
                          </button>

                         <button
                          type="button"
                          className="btn btn-warning me-2"
                          onClick={() => {
                            // reset local filters + selections
                            setQueryInput("");
                            setAppliedQuery("");
                            setProgramInput("All");
                            setAppliedProgram("All");
                            setSelectedRows([]);
                            setPrograms([]);
                            setPage(1);

                            // clear drafts in Redux
                            dispatch(clearDrafts());

                            // clear saved filters in localStorage
                            localStorage.removeItem("lastDraftFilters");
                          }}
                        >
                          Reset Table
                        </button>
                        </div>
                      </div>


                    {/* 🔍 Filters + Search */}
                    <div className="row mb-3 align-items-center">
                      <div className="col-md-6 d-flex">
                        <form onSubmit={handleSearch} className="d-flex w-100">
                          <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Search by name, student number, or VC type"
                            value={queryInput}
                            onChange={(e) => setQueryInput(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary d-flex align-items-center"
                          >
                            <FaSearch className="me-1" /> Search
                          </button>
                        </form>
                      </div>

                      <div className="col-md-6 d-flex justify-content-end align-items-center">
                        <select
                          className="form-select me-2"
                          value={programInput}
                          onChange={(e) => setProgramInput(e.target.value)}
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

                    {/* 📊 Drafts Table */}
                    <div className="table-responsive">
                      <table className="table table-dark table-hover mb-0">
                        <thead>
                          <tr>
                            <th></th>
                            <th>#</th>
                            <th>Student Number</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>VC Type</th>
                            <th>Purpose</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftsLoading ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4">
                                <div className="d-flex flex-column align-items-center">
                                  <div className="spinner-border text-success mb-2" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                  </div>
                                  <span>Loading drafts...</span>
                                </div>
                              </td>
                            </tr>
                          ) : currentVCs.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4">
                                No pending credentials found.
                              </td>
                            </tr>
                          ) : (
                            currentVCs.map((vc, idx) => (
                              <tr
                                key={vc._id}
                                onClick={() => handleRowSelect(vc._id)}
                                className={
                                  selectedRows.includes(vc._id)
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
                                      checked={selectedRows.includes(vc._id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleRowSelect(vc._id);
                                      }}
                                    />
                                  </div>
                                </td>
                                <td>{indexOfFirstRow + idx + 1}</td>
                                <td>{vc.student?.studentNumber || "N/A"}</td>
                                <td>{vc.student?.fullName || "N/A"}</td>
                                <td>{vc.student?.program || "N/A"}</td>
                                <td>{vc.type}</td>
                                <td>{vc.purpose || "N/A"}</td>
                                <td>
                                  <button
                                    className="btn btn-info btn-sm"
                                    onClick={() => handleView(vc)}
                                  >
                                    <FaEye /> View
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 📑 Pagination */}
                    <div className="row mt-3">
                      <div className="col-md-12 d-flex justify-content-end">
                        <nav aria-label="Page navigation">
                          <ul className="pagination mb-0">
                            <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                              <button className="page-link" onClick={() => setPage(Math.max(page - 1, 1))}>
                                &laquo;
                              </button>
                            </li>

                            {Array.from({ length: totalPages }, (_, i) => (
                              <li key={i + 1} className={`page-item ${page === i + 1 ? "active" : ""}`}>
                                <button className="page-link" onClick={() => setPage(i + 1)}>
                                  {i + 1}
                                </button>
                              </li>
                            ))}

                            <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                              <button className="page-link" onClick={() => setPage(Math.min(page + 1, totalPages))}>
                                &raquo;
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 Load Drafts Modal */}
      <LoadDraftModal
        show={showLoadDraftModal}
        onClose={() => setShowLoadDraftsModal(false)}
        onConfirm={(filters) => {
          console.log("🎯 Load drafts with filters:", filters);
          dispatch(getDrafts(filters));
          setShowLoadDraftsModal(false);
        }}
      />

      {/* TOR + Degree + VC Modals */}
      {showCredentialModal && selectedVC?.type?.toLowerCase() === "tor" && (
        <TorModal
          show={showCredentialModal}
          student={selectedVC?.student}
          draft={selectedVC}
          tor={tor}
          loading={loading}
          onClose={() => setShowCredentialModal(false)}
        />
      )}

      {showCredentialModal && selectedVC?.type?.toLowerCase() === "degree" && (
        <DegreeModal
          show={showCredentialModal}
          student={selectedVC?.student}
          draft={selectedVC}
          loading={loading}
          onClose={() => setShowCredentialModal(false)}
        />
      )}

      <VcModal
        show={showVCModal}
        student={selectedVC?.student}
        vc={selectedVC}
        loading={loading}
        onClose={() => setShowVCModal(false)}
      />
    </section>
  );
}

export default VcIssue;

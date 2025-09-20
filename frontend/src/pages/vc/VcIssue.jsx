import React, { useState, useEffect } from "react";
import { FaSearch, FaEye } from "react-icons/fa";
import TorModal from "../../components/layouts/modals/TorModal";
import DegreeModal from "../../components/layouts/modals/DegreeModal";
import ConfirmModal from "../../components/layouts/modals/ConfirmModal";
import VcModal from "../../components/layouts/modals/VcModal";
import { useDispatch, useSelector } from "react-redux";
import { getStudentTor } from "../../features/student/studentSlice";
import { getDrafts } from "../../features/draft_vc/vcSlice"; // 

function VcIssue() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const dispatch = useDispatch();

  // --- Redux states ---
  const { tor, student: vc, isLoading: loading } = useSelector(
    (state) => state.student
  );
  const { drafts, isLoading: draftsLoading } = useSelector(
    (state) => state.vc
  );

  const [selectedVC, setSelectedVC] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showVCModal, setShowVCModal] = useState(false);

  // Fetch drafts on mount
  useEffect(() => {
    dispatch(getDrafts());
  }, [dispatch]);

  const handleConfirmView = (vc) => {
    setSelectedVC(vc);
    setShowConfirmModal(true);
  };

  const handleViewVC = () => {
    setShowConfirmModal(false);
    setShowVCModal(true);
  };

  const handleViewCredential = async () => {
    setShowConfirmModal(false);
    if (selectedVC.type.toLowerCase() === "tor") {
      await dispatch(getStudentTor(selectedVC.student._id));
      setShowCredentialModal(true);
    } else if (selectedVC.type.toLowerCase() === "degree") {
      setShowCredentialModal(true);
    }
  };

  // Filter based on search
  const filteredVCs = drafts.filter(
    (vc) =>
      vc.student?.fullName.toLowerCase().includes(search.toLowerCase()) ||
      vc.student?.studentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      vc.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVCs.length / rowsPerPage);
  const currentVCs = filteredVCs.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCurrentPage = () => {
    const currentIds = currentVCs.map((vc) => vc._id);
    const allSelected = currentIds.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...currentIds])]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <section className="intro mt-4">
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
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold mb-0">
                        Verifiable Credential Issuance
                      </h5>
                      <div>
                        <button className="btn btn-warning me-2">
                          ⚙️ Edit VC Rules
                        </button>
                        <button
                          className="btn btn-success"
                          disabled={selected.length === 0}
                          onClick={() => alert("TODO: Issue VC logic")}
                        >
                          📤 Issue Selected
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="row g-2 mb-4">
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search student name, number, or VC type"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
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

                    {/* Table */}
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                checked={
                                  currentVCs.length > 0 &&
                                  currentVCs.every((vc) => selected.includes(vc._id))
                                }
                                onChange={toggleSelectAllCurrentPage}
                              />
                            </th>
                            <th>#</th>
                            <th>Student Number</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>VC Type</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftsLoading ? (
                            <tr>
                              <td colSpan="7" className="text-center">
                                Loading drafts...
                              </td>
                            </tr>
                          ) : currentVCs.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center">
                                No pending credentials found.
                              </td>
                            </tr>
                          ) : (
                            currentVCs.map((vc, idx) => (
                              <tr key={vc._id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(vc._id)}
                                    onChange={() => toggleSelect(vc._id)}
                                  />
                                </td>
                                <td>{(page - 1) * rowsPerPage + idx + 1}</td>
                                <td>{vc.student?.studentNumber || "N/A"}</td>
                                <td>{vc.student?.fullName || "N/A"}</td>
                                <td>{vc.student?.program || "N/A"}</td>
                                <td>{vc.type}</td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-info"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConfirmView(vc);
                                    }}
                                  >
                                    <FaEye className="me-1" /> View
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <nav>
                      <ul className="pagination justify-content-end">
                        <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => setPage(page - 1)}
                          >
                            &laquo;
                          </button>
                        </li>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <li
                            key={i}
                            className={`page-item ${page === i + 1 ? "active" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setPage(i + 1)}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}
                        <li
                          className={`page-item ${page === totalPages ? "disabled" : ""}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setPage(page + 1)}
                          >
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

      {/* Modals */}
      {showCredentialModal && selectedVC?.type?.toLowerCase() === "tor" && (
        <TorModal
          show={showCredentialModal}
          student={selectedVC?.student}
          tor={tor}
          loading={loading}
          onClose={() => setShowCredentialModal(false)}
        />
      )}

      {showCredentialModal && selectedVC?.type?.toLowerCase() === "degree" && (
        <DegreeModal
          show={showCredentialModal}
          student={selectedVC?.student}
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
      <ConfirmModal
        show={showConfirmModal}
        student={selectedVC?.student}
        vcType={selectedVC?.type?.toLowerCase()}
        onClose={() => setShowConfirmModal(false)}
        onViewVC={handleViewVC}
        onViewCredential={handleViewCredential}
      />
    </section>
  );
}

export default VcIssue;

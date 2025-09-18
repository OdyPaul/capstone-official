import React, { useState, useEffect } from "react";
import { FaSearch, FaEye } from "react-icons/fa";
import axios from "axios";

function VcIssue() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [vcs, setVcs] = useState([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Fetch VC drafts from backend
  useEffect(() => {
    const fetchVCs = async () => {
      try {
        const res = await axios.get("/api/vc/draft");
        setVcs(res.data); // array of VC drafts
      } catch (err) {
        console.error("Error fetching VC drafts:", err);
      }
    };
    fetchVCs();
  }, []);

  // Filter based on search
  const filteredVCs = vcs.filter(
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
    setPage(1); // reset to first page on new search
  };

  const handleIssueVC = async () => {
    try {
      for (const vcId of selected) {
        await axios.post(`/api/vc/${vcId}/issue`);
      }
      alert(`Issued ${selected.length} VC(s)!`);
      // refetch remaining drafts
      const res = await axios.get("/api/vc/draft");
      setVcs(res.data);
      setSelected([]);
    } catch (err) {
      console.error("Error issuing VC:", err);
      alert("Error issuing VC(s). Check console.");
    }
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
                          onClick={handleIssueVC}
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
                                  currentVCs.every((vc) =>
                                    selected.includes(vc._id)
                                  )
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
                          {currentVCs.length === 0 ? (
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
                                  <button className="btn btn-sm btn-info">
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
                          className={`page-item ${
                            page === totalPages ? "disabled" : ""
                          }`}
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
    </section>
  );
}

export default VcIssue;

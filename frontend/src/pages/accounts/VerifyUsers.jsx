import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../../../config";
import { useSelector } from "react-redux";
import {
  FaEye,
  FaTimes,
  FaCheckCircle,
  FaCog,
  FaSearch,
  FaTrash,
} from "react-icons/fa";

function VerifyUsers() {
  const { user } = useSelector((state) => state.auth);

  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("unverified"); // default filter
  const [selectedRows, setSelectedRows] = useState([]);

  // Modals
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState({ face: "", id: "" });

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Fetch all verification requests
  useEffect(() => {
    if (!user?.token) return;

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/verification-request`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setRequests(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || "Failed to fetch verification requests"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  // Apply search + filter
  useEffect(() => {
    let data = [...requests];

    if (statusFilter !== "all") {
      data = data.filter((r) => r.status === statusFilter);
    }

    if (query) {
      const q = query.toLowerCase();
      data = data.filter((r) =>
        r.personal?.fullName?.toLowerCase().includes(q)
      );
    }

    setFiltered(data);
    setCurrentPage(1);
  }, [requests, query, statusFilter]);

  // Pagination slice
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRequests = filtered.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  // Row selection
  const handleRowSelect = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleUnselectSelected = () => {
    setSelectedRows([]);
  };

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
                        <h5 className="mb-0 fw-bold">Verify Users</h5>
                      </div>
                    </div>

                    {/* 🔍 Filters + Search Row */}
                    <div className="row mb-3 align-items-center">
                      {/* Search */}
                      <div className="col-md-6 d-flex">
                        <form
                          onSubmit={(e) => e.preventDefault()}
                          className="d-flex w-100"
                        >
                          <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Search by name"
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

                      {/* Filters */}
                      <div className="col-md-6 d-flex justify-content-end align-items-center">
                        <select
                          className="form-select me-2"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          style={{ maxWidth: "200px" }}
                        >
                          <option value="all">All</option>
                          <option value="verified">Verified</option>
                          <option value="unverified">Unverified</option>
                        </select>

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

                    {/* 📊 Table */}
                    <div className="table-responsive">
                      <table className="table table-dark table-hover mb-0">
                        <thead>
                          <tr>
                            <th></th>
                            <th>#</th>
                            <th>Full Name</th>
                            <th>Address</th>
                            <th>Birth Place</th>
                            <th>Birth Date</th>
                            <th>Status</th>
                            <th>Requested At</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRequests.map((req, idx) => (
                            <tr
                              key={req._id}
                              onClick={() => handleRowSelect(req._id)}
                              className={
                                selectedRows.includes(req._id)
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
                                    checked={selectedRows.includes(req._id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleRowSelect(req._id);
                                    }}
                                  />
                                </div>
                              </td>
                              <td>{indexOfFirstRow + idx + 1}</td>
                              <td>{req.personal?.fullName || "N/A"}</td>
                              <td>{req.personal?.address || "N/A"}</td>
                              <td>{req.personal?.birthPlace || "N/A"}</td>
                              <td>
                                {req.personal?.birthDate
                                  ? new Date(
                                      req.personal.birthDate
                                    ).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td>{req.status}</td>
                              <td>{new Date(req.createdAt).toLocaleString()}</td>
                              <td>
                                <button className="btn btn-info btn-sm px-2 me-1">
                                  <FaEye />
                                </button>
                                <button className="btn btn-success btn-sm px-2 me-1">
                                  <FaCheckCircle />
                                </button>
                                <button className="btn btn-danger btn-sm px-2 me-1">
                                  <FaTimes />
                                </button>
                                <button className="btn btn-secondary btn-sm px-2">
                                  <FaCog />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filtered.length === 0 && <p>No requests found.</p>}
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
                                  setCurrentPage((prev) => Math.max(prev - 1, 1))
                                }
                              >
                                &laquo;
                              </button>
                            </li>

                            {Array.from({ length: totalPages }, (_, i) => (
                              <li
                                key={i + 1}
                                className={`page-item ${
                                  currentPage === i + 1 ? "active" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPage(i + 1)}
                                >
                                  {i + 1}
                                </button>
                              </li>
                            ))}

                            <li
                              className={`page-item ${
                                currentPage === totalPages ? "disabled" : ""
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
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}

export default VerifyUsers;

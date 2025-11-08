import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, Table, Button, Badge, Spinner, Alert, Modal } from "react-bootstrap";
import { FaSync, FaCheck, FaTimes, FaTrash, FaArrowRight } from "react-icons/fa";
import { getAllRequests, reviewRequest, deleteRequest } from "../../features/request/requestsSlice";
import { NavLink, useNavigate } from "react-router-dom";

function Request() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    items = [],
    isLoading = false,
    isUpdating = false,
    isError = false,
    message = "",
  } = useSelector((s) => s.requests || {});

  const [statusFilter, setStatusFilter] = useState("all");

  // confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmKind, setConfirmKind] = useState(null); // 'approve' | 'reject' | 'delete'
  const [targetRow, setTargetRow] = useState(null);
  const closeConfirm = () => { setShowConfirm(false); setConfirmKind(null); setTargetRow(null); };

  useEffect(() => {
    dispatch(getAllRequests({}));
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return (items || []).filter((r) => r.status === statusFilter);
  }, [items, statusFilter]);

  const shortId = (v) => {
    const s = String(v || "");
    return s.length > 8 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s || "—";
  };

  const openConfirm = (kind, row) => {
    setConfirmKind(kind);
    setTargetRow(row);
    setShowConfirm(true);
  };

  // direct navigation helper
  const goToCreateDrafts = (row) => {
    if (!row) return;
     const studentNumber = row?.studentNumber || row?.studentProfile?.studentNumber;
    if (!studentNumber) return;
    const type = row.vcType || String(row.type || "").toUpperCase();
    const purpose = row.vcPurpose || String(row.purpose || "").toLowerCase();

    
     const meta = {
       student: {
         // keep profileId for /students/:id routes, but querystring uses studentNumber
         _id: row?.profileId || row?.studentId || null,
         studentNumber: String(studentNumber),
         fullName: row?.fullName || null,
         program: row?.program || null,
         photoUrl: row?.photoUrl || null,
       },
       type,
       purpose,
       vcReq: String(row._id),
     };  
     navigate(
       `/vc/sub/createDrafts?studentNumber=${encodeURIComponent(studentNumber)}&type=${encodeURIComponent(type)}&purpose=${encodeURIComponent(purpose)}&vcReq=${encodeURIComponent(row._id)}`,
       { state: { vcMeta: meta } }
    );
   };

  const doAction = async () => {
    if (!targetRow?._id) return;
    try {
      if (confirmKind === "approve") {
        await dispatch(reviewRequest({ id: targetRow._id, status: "approved" })).unwrap();
        goToCreateDrafts(targetRow);
      } else if (confirmKind === "reject") {
        await dispatch(reviewRequest({ id: targetRow._id, status: "rejected" })).unwrap();
        await dispatch(getAllRequests({}));
      } else if (confirmKind === "delete") {
        await dispatch(deleteRequest(targetRow._id)).unwrap();
      }
    } finally {
      closeConfirm();
    }
  };

  const statusVariant = (s) =>
    s === "pending" ? "warning" : s === "approved" ? "success" : s === "rejected" ? "danger" : "primary";

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">VC Requests</h1>
        <div className="d-flex gap-2">
          <select
            className="form-select"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="issued">issued</option>
          </select>
          <Button variant="outline-primary" onClick={() => dispatch(getAllRequests({}))}>
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {isError ? <Alert variant="danger">{String(message)}</Alert> : null}

      <Card>
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <strong>Requests</strong>
          <Badge bg="secondary">{filtered.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Created</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th style={{ width: 320 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((r) => (
                    <tr key={r._id}>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                      <td>
                        {r.profileId ? (
                          <NavLink to={`/students/${r.profileId}`} className="text-decoration-none">
                            {r.studentNumber || shortId(r.profileId)}
                          </NavLink>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="d-flex align-items-center gap-2">
                        {r.photoUrl ? (
                          <img
                            src={r.photoUrl}
                            alt=""
                            style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }}
                          />
                        ) : (
                          <div className="text-muted small">—</div>
                        )}
                        <span>{r.fullName || "—"}</span>
                      </td>
                      <td>{r.program || "—"}</td>
                      <td><Badge bg="dark">{r.vcType || r.type}</Badge></td>
                      <td style={{ maxWidth: 260 }}><span className="text-muted">{r.vcPurpose || r.purpose || "—"}</span></td>
                      <td><Badge bg={statusVariant(r.status)}>{r.status}</Badge></td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-success"
                            disabled={isUpdating || r.status !== "pending"}
                            onClick={() => openConfirm("approve", r)}
                            title="Approve (then go to Create Drafts)"
                          >
                            <FaCheck className="me-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={isUpdating || r.status === "rejected"}
                            onClick={() => openConfirm("reject", r)}
                          >
                            <FaTimes className="me-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={isUpdating}
                            onClick={() => openConfirm("delete", r)}
                            title="Delete request"
                          >
                            <FaTrash className="me-1" /> Trash
                          </Button>

                          {/* Direct "Go" button */}
                          <Button
                            size="sm"
                            variant="outline-info"
                            title="Go to Create Drafts (prefilled)"
                            onClick={() => goToCreateDrafts(r)}
                            disabled={isUpdating || !r?.studentNumber}
                          >
                            <FaArrowRight className="me-1" /> Go
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4">No requests.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Confirm modal */}
      <Modal show={showConfirm} onHide={closeConfirm} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {confirmKind === "approve" ? "Approve Request"
              : confirmKind === "reject" ? "Reject Request"
              : "Delete Request"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {targetRow ? (
            <>
              <div className="mb-2">
                <div className="text-muted small">Student</div>
                <div className="fw-semibold">
                  {targetRow.fullName || "—"}
                </div>
                <div className="text-muted small">
                  {(targetRow.studentNumber || "—")} • {(targetRow.program || "—")}
                </div>
              </div>
              <div className="mb-2">
                <div className="text-muted small">Request</div>
                <div><strong>Type:</strong> {targetRow.vcType || targetRow.type || "—"}</div>
                <div><strong>Purpose:</strong> {targetRow.vcPurpose || targetRow.purpose || "—"}</div>
                <div><strong>Status:</strong> <Badge bg={statusVariant(targetRow?.status)}>{targetRow?.status}</Badge></div>
              </div>
              <hr />
              {confirmKind === "approve" && (
                <div>Proceed to approve and continue to <code>/vc/sub/createDrafts</code> for this student?</div>
              )}
              {confirmKind === "reject" && (
                <div>Are you sure you want to reject this request?</div>
              )}
              {confirmKind === "delete" && (
                <div>This will permanently delete the request. Continue?</div>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeConfirm}>Cancel</Button>
          <Button
            variant={confirmKind === "approve" ? "success" : confirmKind === "reject" ? "danger" : "secondary"}
            onClick={doAction}
            disabled={isUpdating || !targetRow}
          >
            {confirmKind === "approve" ? "Approve & Continue"
              : confirmKind === "reject" ? "Reject"
              : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}

export default Request;

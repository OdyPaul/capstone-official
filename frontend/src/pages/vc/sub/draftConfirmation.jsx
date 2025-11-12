// src/pages/issuance/sub/DraftConfirmation.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { issueSelected, loadIssuable } from "../../../features/issuance/issuanceSlice";
import { Button, Card, Table, Spinner, Form, Alert, Modal, Badge } from "react-bootstrap";
import { FaArrowLeft, FaRocket, FaCheckCircle } from "react-icons/fa";

/* --------------------------- Success modal --------------------------- */
function SuccessModal({ show, onClose, title = "SUCCESS", message = "All selected credentials were issued successfully." }) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton className="border-0" />
      <Modal.Body className="text-center pt-0">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success mb-3"
          style={{ width: 72, height: 72 }}
        >
          <FaCheckCircle size={40} className="text-white" />
        </div>
        <h5 className="text-success fw-bold mb-2">{title}</h5>
        <div className="text-muted">{message}</div>
      </Modal.Body>
      <Modal.Footer className="border-0 p-0">
        <Button
          variant="success"
          className="w-100 rounded-0 py-3"
          onClick={onClose}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------- Confirm modal --------------------------- */
function ConfirmIssueModal({ show, onHide, items = [], anchorNow = false, isIssuing = false }) {
  const isSingle = items.length === 1;
  const anchorChip = (
    <Badge bg={anchorNow ? "success" : "secondary"} className="ms-1">
      Anchor: {anchorNow ? "Yes" : "No"}
    </Badge>
  );

  return (
    <Modal show={show} onHide={() => onHide(false)} centered size={isSingle ? undefined : "lg"}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Issue{isSingle ? "" : " (" + items.length + ")"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isSingle ? (
          <>
            <p className="mb-2">
              You are about to issue the following credential {anchorChip}
            </p>
            <div className="table-responsive">
              <Table bordered size="sm" className="mb-0 align-middle">
                <tbody>
                  <tr>
                    <th style={{ width: 160 }}>Student</th>
                    <td>{items[0].name || "—"}</td>
                  </tr>
                  <tr>
                    <th>Type</th>
                    <td>{items[0].type || "—"}</td>
                  </tr>
                  <tr>
                    <th>Purpose</th>
                    <td>{items[0].purpose || "—"}</td>
                  </tr>
                  <tr>
                    <th>Amount</th>
                    <td>{items[0].amount || "—"}</td>
                  </tr>
                  <tr>
                    <th>Payment TX</th>
                    <td><code>{items[0].tx || "—"}</code></td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </>
        ) : (
          <>
            <div className="mb-2">
              You are about to issue <strong>{items.length}</strong> credentials {anchorChip}
            </div>
            <div className="table-responsive">
              <Table bordered hover size="sm" className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Amount</th>
                    <th>Payment TX</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id || i}>
                      <td>{i + 1}</td>
                      <td>{it.name || "—"}</td>
                      <td>{it.type || "—"}</td>
                      <td>{it.purpose || "—"}</td>
                      <td>{it.amount || "—"}</td>
                      <td><code>{it.tx || "—"}</code></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => onHide(false)} disabled={isIssuing}>
          Cancel
        </Button>
        <Button variant="success" onClick={() => onHide(true)} disabled={isIssuing}>
          {isIssuing ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" /> Issuing…
            </>
          ) : (
            <>
              <FaRocket className="me-2" />
              Confirm Issue
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------------- page --------------------------------- */
export default function DraftConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const selectedIds = Array.isArray(state?.selectedIds) ? state.selectedIds : [];
  const { issuable, isIssuing, lastIssueResults, message, isError } = useSelector((s) => s.issuance);
  const [anchorNow, setAnchorNow] = useState(false);

  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("All selected credentials were issued successfully.");

  const selectedRows = useMemo(
    () => (issuable || []).filter((p) => selectedIds.includes(p?.draft?._id)),
    [issuable, selectedIds]
  );

  const confirmItems = useMemo(
    () =>
      selectedRows.map((p) => ({
        id: p?.draft?._id,
        name: p?.draft?.student?.fullName || "—",
        type: p?.draft?.type || "—",
        purpose: p?.draft?.purpose || "—",
        amount: `${Number(p?.amount).toFixed(2)} ${p?.currency || "PHP"}`,
        tx: p?.tx_no || "",
      })),
    [selectedRows]
  );

  const actuallyIssue = useCallback(async () => {
    if (selectedIds.length === 0) return;
    await dispatch(issueSelected({ draftIds: selectedIds, anchorNow }));
    await dispatch(loadIssuable({})); // refresh list
  }, [dispatch, selectedIds, anchorNow]);

  const onConfirmClick = () => {
    if (selectedIds.length === 0) return;
    setShowConfirm(true);
  };

  const onConfirmClose = async (ok) => {
    setShowConfirm(false);
    if (!ok) return;
    await actuallyIssue();
  };

  const successCount = (lastIssueResults || []).filter((r) => r.ok).length;
  const errorCount = (lastIssueResults || []).filter((r) => !r.ok).length;

  // When results arrive and no errors, show success modal like the sample
  useEffect(() => {
    if (successCount > 0 && errorCount === 0) {
      setSuccessMessage(
        successCount === 1
          ? "We are delighted to inform you that the credential has been issued."
          : `We are delighted to inform you that ${successCount} credentials have been issued.`
      );
      setShowSuccess(true);
    }
  }, [successCount, errorCount]);

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <Button as={NavLink} to="/vc/issue" variant="outline-secondary">
          <FaArrowLeft className="me-2" />
          Back
        </Button>
        <h1 className="h4 mb-0">Confirm Issuance</h1>
        <div />
      </div>

      <Card className="mb-3">
        <Card.Body className="d-flex align-items-center justify-content-between">
          <div>
            <div className="fw-semibold">Selected Drafts</div>
            <div className="text-muted small">{selectedIds.length} item(s)</div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <Form.Check
              type="switch"
              id="anchor-now-switch"
              label="Anchor immediately"
              checked={anchorNow}
              onChange={(e) => setAnchorNow(e.target.checked)}
              disabled={isIssuing}
            />
            <Button
              variant="success"
              onClick={onConfirmClick}
              disabled={isIssuing || selectedIds.length === 0}
            >
              {isIssuing ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" /> Issuing…
                </>
              ) : (
                <>
                  <FaRocket className="me-2" />
                  Confirm Issue
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Payment TX</th>
                  <th>Anchor Pref</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((p) => (
                  <tr key={p._id}>
                    <td>{p?.draft?.type || "—"}</td>
                    <td>{p?.draft?.purpose || "—"}</td>
                    <td>
                      {Number(p?.amount).toFixed(2)} {p?.currency || "PHP"}
                    </td>
                    <td>
                      <code>{p?.tx_no}</code>
                    </td>
                    <td>{anchorNow ? "Yes" : "No"}</td>
                  </tr>
                ))}
                {selectedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      Nothing selected.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {lastIssueResults && (
        <Alert variant={errorCount ? "warning" : "success"}>
          Issued: {successCount}, Errors: {errorCount}.
          {errorCount ? (
            <ul className="mb-0 mt-2">
              {lastIssueResults
                .filter((r) => !r.ok)
                .slice(0, 5)
                .map((r) => (
                  <li key={r.id}>
                    <code>{r.id}</code> — {r.error}
                  </li>
                ))}
            </ul>
          ) : null}
        </Alert>
      )}

      {isError && message ? <Alert variant="danger" className="mt-3">{message}</Alert> : null}

      {/* Confirm modal */}
      <ConfirmIssueModal
        show={showConfirm}
        onHide={onConfirmClose}
        items={confirmItems}
        anchorNow={anchorNow}
        isIssuing={isIssuing}
      />

      {/* Success modal */}
      <SuccessModal
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="SUCCESS"
        message={successMessage}
      />
    </section>
  );
}

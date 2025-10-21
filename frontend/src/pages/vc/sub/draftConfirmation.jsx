// src/pages/issuance/sub/DraftConfirmation.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { issueSelected, loadIssuable } from "../../../features/issuance/issuanceSlice";
import { Button, Card, Table, Spinner, Form, Alert } from "react-bootstrap";
import { FaArrowLeft, FaRocket } from "react-icons/fa";

export default function DraftConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const selectedIds = Array.isArray(state?.selectedIds) ? state.selectedIds : [];
  const { issuable, isIssuing, lastIssueResults, message, isError } = useSelector((s) => s.issuance);
  const [anchorNow, setAnchorNow] = useState(false);

  const selectedRows = useMemo(
    () => issuable.filter((p) => selectedIds.includes(p?.draft?._id)),
    [issuable, selectedIds]
  );

  const onConfirm = async () => {
    if (selectedIds.length === 0) return;
    await dispatch(issueSelected({ draftIds: selectedIds, anchorNow }));
    await dispatch(loadIssuable({})); // refresh list
  };

  const successCount = (lastIssueResults || []).filter(r => r.ok).length;
  const errorCount = (lastIssueResults || []).filter(r => !r.ok).length;

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
            />
            <Button variant="success" onClick={onConfirm} disabled={isIssuing || selectedIds.length === 0}>
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
                    <td>{Number(p?.amount).toFixed(2)} {p?.currency || "PHP"}</td>
                    <td><code>{p?.tx_no}</code></td>
                    <td>{p?.anchorNow ? "Yes" : "No"}</td>
                  </tr>
                ))}
                {selectedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Nothing selected.</td>
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
              {lastIssueResults.filter(r => !r.ok).slice(0, 5).map((r) => (
                <li key={r.id}><code>{r.id}</code> — {r.error}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      )}

      {isError && message ? (
        <Alert variant="danger" className="mt-3">{message}</Alert>
      ) : null}
    </section>
  );
}

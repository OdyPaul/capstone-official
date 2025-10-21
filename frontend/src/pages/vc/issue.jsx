// src/pages/issuance/Issue.jsx
import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import {
  loadIssuable,
  toggleSelect,
  setSelected,
} from "../../features/issuance/issuanceSlice";
import {
  Button,
  Card,
  Table,
  Spinner,
  Form,
  Badge,
} from "react-bootstrap";
import { FaSync, FaCheck, FaHistory, FaMoneyCheckAlt } from "react-icons/fa";

export default function Issue() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { issuable, selected, isLoadingIssuable } = useSelector((s) => s.issuance);

  useEffect(() => {
    dispatch(loadIssuable({}));
  }, [dispatch]);

  // No search filtering — show all issuable items
  const filtered = useMemo(() => issuable || [], [issuable]);

  const allVisIds = useMemo(
    () => filtered.map((p) => p?.draft?._id).filter(Boolean),
    [filtered]
  );
  const allSelectedOnPage =
    allVisIds.length > 0 && allVisIds.every((id) => selected.includes(id));

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Issuance</h1>
        <div className="d-flex gap-2">
          <Button as={NavLink} to="/vc/sub/transactions" variant="outline-secondary">
            <FaHistory className="me-2" /> Transactions
          </Button>
          <Button as={NavLink} to="/issuance/payments" variant="outline-secondary">
            <FaMoneyCheckAlt className="me-2" /> Confirm Payments
          </Button>
          <Button variant="outline-primary" onClick={() => dispatch(loadIssuable({}))}>
            <FaSync className="me-2" /> Load Paid Drafts
          </Button>
          <Button
            variant="success"
            disabled={selected.length === 0}
            onClick={() =>
              navigate("/vc/sub/draftConfirmation", {
                state: { selectedIds: selected },
              })
            }
          >
            <FaCheck className="me-2" />
            Issue Selected ({selected.length})
          </Button>
        </div>
      </div>

      {/* Removed the search panel/card */}

      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <strong>Paid &amp; Unused Receipts (ready to issue)</strong>
          <div className="small text-muted">
            Selected: <Badge bg="secondary">{selected.length}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 42 }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={() => {
                        if (allSelectedOnPage) {
                          const toKeep = new Set(selected);
                          allVisIds.forEach((id) => toKeep.delete(id));
                          dispatch(setSelected(Array.from(toKeep)));
                        } else {
                          const union = new Set([...selected, ...allVisIds]);
                          dispatch(setSelected(Array.from(union)));
                        }
                      }}
                    />
                  </th>
                  <th>Student name</th>
                  <th>Student ID</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Payment TX</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingIssuable ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((p) => {
                    const d = p.draft || {};
                    const id = d._id;
                    const checked = selected.includes(id);
                    const student = (d && d.student) || {};
                    return (
                      <tr key={p._id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            onChange={() => dispatch(toggleSelect(id))}
                          />
                        </td>
                        <td>
                          <div className="fw-semibold">
                            {student.fullName || "—"}
                          </div>
                          {/* Optional extra context like the draft page */}
                          <div className="small text-muted">
                            {student.program || "—"}
                          </div>
                        </td>
                        <td>{student.studentNumber ? `#${student.studentNumber}` : "—"}</td>
                        <td>{d.type || "—"}</td>
                        <td>{d.purpose || "—"}</td>
                        <td>
                          {Number(p.amount).toFixed(2)} {p.currency || "PHP"}
                        </td>
                        <td>
                          <code>{p.tx_no}</code>
                          {d.payment_tx_no && d.payment_tx_no !== p.tx_no ? (
                            <>
                              {" "}
                              <span className="text-muted">/ draft: </span>
                              <code>{d.payment_tx_no}</code>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <Badge bg="success">paid</Badge>{" "}
                          {!p.consumed_at ? (
                            <Badge bg="secondary">unused</Badge>
                          ) : (
                            <Badge bg="dark">consumed</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      No paid receipts found (or all consumed). Click “Load Paid Drafts”.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </section>
  );
}

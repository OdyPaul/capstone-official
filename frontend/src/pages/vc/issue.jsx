// src/pages/issuance/Issue.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import {
  loadIssuable,
  toggleSelect,
  setSelected,
  markPaymentPaid,
} from "../../features/issuance/issuanceSlice";
import {
  Button, Card, Table, Spinner, Row, Col, Form, InputGroup, Badge, Modal,
} from "react-bootstrap";
import { FaSync, FaCheck, FaHistory, FaMoneyCheckAlt } from "react-icons/fa";

// Simple modal that calls parent onSubmit(txNo, {receipt_no, ...})
function MarkPaidModal({ show, onHide, defaultTxNo, onSubmit }) {
  const [txNo, setTxNo] = useState(defaultTxNo || "");
  const [receipt, setReceipt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTxNo(defaultTxNo || "");
    setReceipt("");
    setError("");
  }, [defaultTxNo, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!txNo.trim() || !receipt.trim()) {
      setError("Both fields are required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(txNo.trim(), {
        method: "cash",
        receipt_no: receipt.trim(),
        receipt_date: new Date().toISOString().slice(0, 10),
      });
      onHide(true);
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Mark-paid failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={() => onHide(false)} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Mark Payment as Paid</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Payment TX No</Form.Label>
            <Form.Control
              placeholder="e.g. TX-202501011230-ABCD"
              value={txNo}
              onChange={(e) => setTxNo(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Receipt No</Form.Label>
            <Form.Control
              placeholder="Enter cashier receipt number…"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
          </Form.Group>
          {error ? <div className="text-danger mt-2">{error}</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => onHide(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Save Paid
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function Issue() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { issuable, selected, isLoadingIssuable } = useSelector((s) => s.issuance);

  const [q, setQ] = useState("");
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [prefillTx, setPrefillTx] = useState("");

  useEffect(() => {
    dispatch(loadIssuable({}));
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!q.trim()) return issuable;
    const needle = q.toLowerCase();
    return (issuable || []).filter((p) => {
      const d = p?.draft || {};
      return (
        (p.tx_no || "").toLowerCase().includes(needle) ||
        (d.type || "").toLowerCase().includes(needle) ||
        (d.purpose || "").toLowerCase().includes(needle) ||
        (d.payment_tx_no || "").toLowerCase().includes(needle)
      );
    });
  }, [issuable, q]);

  const allVisIds = useMemo(
    () => filtered.map((p) => p?.draft?._id).filter(Boolean),
    [filtered]
  );
  const allSelectedOnPage = allVisIds.length > 0 && allVisIds.every((id) => selected.includes(id));

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Issuance</h1>
        <div className="d-flex gap-2">
          <Button as={NavLink} to="/issuance/transactions" variant="outline-secondary">
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
              navigate("/issuance/draft-confirmation", {
                state: { selectedIds: selected },
              })
            }
          >
            <FaCheck className="me-2" />
            Issue Selected ({selected.length})
          </Button>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-center">
            <Col md={6}>
              <Form onSubmit={(e) => e.preventDefault()}>
                <InputGroup>
                  <InputGroup.Text>Search</InputGroup.Text>
                  <Form.Control
                    placeholder="TX no, Purpose, Type…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </InputGroup>
              </Form>
            </Col>
            <Col md={6} className="text-end">
              <Button
                variant="outline-success"
                onClick={() => {
                  setPrefillTx("");
                  setShowPaidModal(true);
                }}
              >
                <FaMoneyCheckAlt className="me-2" />
                Mark a Payment Paid
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

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
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Payment TX</th>
                  <th>Status</th>
                  <th style={{ width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingIssuable ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((p) => {
                    const d = p.draft || {};
                    const id = d._id;
                    const checked = selected.includes(id);
                    return (
                      <tr key={p._id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            onChange={() => dispatch(toggleSelect(id))}
                          />
                        </td>
                        <td>{d.type || "—"}</td>
                        <td>{d.purpose || "—"}</td>
                        <td>{Number(p.amount).toFixed(2)} {p.currency || "PHP"}</td>
                        <td>
                          <code>{p.tx_no}</code>
                          {d.payment_tx_no && d.payment_tx_no !== p.tx_no ? (
                            <> <span className="text-muted">/ draft: </span><code>{d.payment_tx_no}</code></>
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
                        <td>
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => {
                              setPrefillTx(p.tx_no);
                              setShowPaidModal(true);
                            }}
                          >
                            Mark Paid…
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No paid receipts found (or all consumed). Click “Load Paid Drafts”.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <MarkPaidModal
        show={showPaidModal}
        onHide={(ok) => {
          setShowPaidModal(false);
          if (ok) dispatch(loadIssuable({}));
        }}
        defaultTxNo={prefillTx}
        onSubmit={(txNo, payload) => dispatch(markPaymentPaid({ txNo, payload })).unwrap()}
      />
    </section>
  );
}

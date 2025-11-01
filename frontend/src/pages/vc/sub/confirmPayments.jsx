import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import {
  loadPendingPayments,
  markPaymentPaid,
} from "../../../features/issuance/issuanceSlice";
import {
  Button, Card, Table, Spinner, Row, Col, Form, InputGroup, Badge, Modal,
} from "react-bootstrap";
import { FaArrowLeft, FaSync, FaEye, FaMoneyCheckAlt } from "react-icons/fa";

// Modal to show a single TX number (with copy)
function TxViewerModal({ show, onHide, txNo }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(txNo || ""); } catch {}
  };
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>Payment TX No</Modal.Title></Modal.Header>
      <Modal.Body>
        <code className="d-inline-block p-2 bg-light rounded">{txNo || "—"}</code>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={copy}>Copy</Button>
        <Button variant="primary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

// Reuse a local MarkPaid modal (same UX as Issuance page)
// Reuse a local MarkPaid modal (same UX as Issuance page)
function MarkPaidModal({ show, onHide, defaultTxNo, onSubmit }) {
  // Generate a server-friendly receipt number (no spaces)
  const buildReceipt = (tx) => {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const last4 = String(tx || "").split("-").pop().slice(-4).toUpperCase();
    const rand2 = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `RCPT-TEST-${ymd}-${last4}${rand2}`; // ✅ no spaces, only A-Z0-9-
  };

  const [txNo, setTxNo] = useState(defaultTxNo || "");
  const [receipt, setReceipt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTxNo(defaultTxNo || "");
    setError("");
    setReceipt(buildReceipt(defaultTxNo || ""));
  }, [defaultTxNo, show]);

  // keep value compliant with backend regex: ^[A-Z0-9\-]{3,32}$
  const onReceiptChange = (e) => {
    const v = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, "-") // replace disallowed chars
      .replace(/-+/g, "-")          // collapse runs of '-'
      .slice(0, 32);                // enforce max length
    setReceipt(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanTx = txNo.trim();
    const cleanRcpt = receipt.trim();

    if (!cleanTx || !cleanRcpt) {
      setError("Both fields are required.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(cleanTx, {
        method: "cash",
        receipt_no: cleanRcpt,                         // already uppercase
        receipt_date: new Date().toISOString().slice(0, 10),
      });
      onHide(true);
    } catch (err) {
      const msg =
        (err?.response?.data?.message ||
          err?.message ||
          "Mark-paid failed") + "";

      // If duplicate receipt, auto-suggest a new one so user can retry immediately
      if (msg.toLowerCase().includes("receipt number already used")) {
        setReceipt(buildReceipt(cleanTx));
      }
      setError(msg);
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
              value={txNo}
              onChange={(e) => setTxNo(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Receipt No</Form.Label>
            <InputGroup>
              <Form.Control
                placeholder="RCPT-TEST-YYYYMMDD-XXXX"
                value={receipt}
                onChange={onReceiptChange}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setReceipt(buildReceipt(txNo))}
                title="Regenerate receipt"
              >
                Regenerate
              </Button>
            </InputGroup>
            <Form.Text className="text-muted">
              Must be 3–32 chars, uppercase letters, digits, and dashes only.
            </Form.Text>
          </Form.Group>
          {error ? <div className="text-danger mt-2">{error}</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => onHide(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            Save Paid
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}


export default function PaymentConfirmation() {
  const dispatch = useDispatch();
  const { pending, isLoadingPending } = useSelector((s) => s.issuance);

  const [q, setQ] = useState("");
  const [showTx, setShowTx] = useState(false);
  const [txNoToShow, setTxNoToShow] = useState("");
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [prefillTx, setPrefillTx] = useState("");

  useEffect(() => {
    dispatch(loadPendingPayments({}));
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!q.trim()) return pending || [];
    const needle = q.toLowerCase();
    return (pending || []).filter((p) => {
      const d = p?.draft || {};
      return (
        (p.tx_no || "").toLowerCase().includes(needle) ||
        (d.type || "").toLowerCase().includes(needle) ||
        (d.purpose || "").toLowerCase().includes(needle) ||
        (d.payment_tx_no || "").toLowerCase().includes(needle)
      );
    });
  }, [pending, q]);
  const suggestReceipt = (tx) => {
  const ymd = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const last4 = String(tx || '').split('-').pop().slice(-4).toUpperCase();
  const rand2 = Math.random().toString(36).slice(2,4).toUpperCase();
  return `RCPT-${ymd}-${last4}${rand2}`;
};

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <Button as={NavLink} to="/vc/issue" variant="outline-secondary">
          <FaArrowLeft className="me-2" />
          Back to Issuance
        </Button>
        <h1 className="h5 mb-0">Confirm Payments</h1>
        <Button variant="outline-primary" onClick={() => dispatch(loadPendingPayments({}))}>
          <FaSync className="me-2" /> Reload
        </Button>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  placeholder="tx_no, purpose, type…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </InputGroup>
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
        <Card.Header className="bg-light">
          <strong>Pending Payments (unpaid)</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>TX No</th>
                  <th>Status</th>
                  <th style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingPending ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((p) => (
                    <tr key={p._id}>
                      <td>{p?.draft?.type || "—"}</td>
                      <td>{p?.draft?.purpose || "—"}</td>
                      <td>{Number(p.amount).toFixed(2)} {p.currency || "PHP"}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => {
                            setTxNoToShow(p.tx_no);
                            setShowTx(true);
                          }}
                          title="View TX"
                        >
                          <FaEye className="me-1" />
                          View
                        </Button>
                      </td>
                      <td><Badge bg="secondary">{p.status}</Badge></td>
                      <td>
                        <div className="d-flex gap-2">
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
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No pending payments.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <TxViewerModal show={showTx} txNo={txNoToShow} onHide={() => setShowTx(false)} />

      <MarkPaidModal
        show={showPaidModal}
        onHide={(ok) => {
          setShowPaidModal(false);
          if (ok) dispatch(loadPendingPayments({}));
        }}
        defaultTxNo={prefillTx}
        onSubmit={(txNo, payload) => dispatch(markPaymentPaid({ txNo, payload })).unwrap()}
      />
    </section>
  );
}

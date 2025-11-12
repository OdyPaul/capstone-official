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
import { FaArrowLeft, FaSync, FaEye, FaMoneyCheckAlt, FaCheckCircle } from "react-icons/fa";

/* ------------------------------- Modals ------------------------------- */

// Success modal (green check, headline, message, full-width CTA)
function SuccessModal({ show, onClose, title = "SUCCESS", message = "We are delighted to inform you that we received your payment." }) {
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

// View a single TX number (with copy)
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

// Small input modal (collects TX + Receipt), then hands off to a confirm modal via onPreview(...)
function MarkPaidModal({ show, onHide, defaultTxNo, defaultReceipt, onPreview }) {
  const buildReceipt = (tx) => {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const last4 = String(tx || "").split("-").pop().slice(-4).toUpperCase();
    const rand2 = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `RCPT-TEST-${ymd}-${last4}${rand2}`;
  };

  const [txNo, setTxNo] = useState(defaultTxNo || "");
  const [receipt, setReceipt] = useState(defaultReceipt || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setTxNo(defaultTxNo || "");
    setError("");
    setReceipt(defaultReceipt || buildReceipt(defaultTxNo || ""));
  }, [defaultTxNo, defaultReceipt, show]);

  const onReceiptChange = (e) => {
    const v = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 32);
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

    onPreview(cleanTx, {
      method: "cash",
      receipt_no: cleanRcpt,
      receipt_date: new Date().toISOString().slice(0, 10),
    });
    onHide(false);
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
          <Button type="submit" variant="success">
            Continue
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// Final confirmation summary before dispatching markPaymentPaid
function ConfirmMarkPaidModal({
  show,
  onHide,          // onHide(ok: boolean)
  item,            // { txNo, payload, meta }
  isSaving,
  error,
  onBack,          // go back to edit values
}) {
  const found = item?.meta?.found;
  const summaryRows = [
    ["Student", found?.draft?.student?.fullName || "—"],
    ["Type", found?.draft?.type || "—"],
    ["Purpose", found?.draft?.purpose || "—"],
    ["Amount", found ? `${Number(found.amount).toFixed(2)} ${found.currency || "PHP"}` : "—"],
    ["Current Status", found?.status || "—"],
    ["TX No", item?.txNo || "—"],
    ["Receipt No", item?.payload?.receipt_no || "—"],
    ["Receipt Date", item?.payload?.receipt_date || "—"],
    ["Method", (item?.payload?.method || "cash").toUpperCase()],
  ];

  return (
    <Modal show={show} onHide={() => onHide(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Mark as Paid</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-2">Please confirm the payment details below.</div>
        <div className="table-responsive">
          <Table bordered size="sm" className="mb-0 align-middle">
            <tbody>
              {summaryRows.map(([k, v]) => (
                <tr key={k}>
                  <th style={{ width: 160 }}>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {error ? <div className="text-danger mt-3">{String(error)}</div> : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onBack} disabled={isSaving}>
          Back
        </Button>
        <Button variant="outline-secondary" onClick={() => onHide(false)} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="success" onClick={() => onHide(true)} disabled={isSaving}>
          {isSaving ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" /> Saving…
            </>
          ) : (
            "Confirm Paid"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* --------------------------- Page Component --------------------------- */

export default function PaymentConfirmation() {
  const dispatch = useDispatch();
  const { pending, isLoadingPending } = useSelector((s) => s.issuance);

  const [q, setQ] = useState("");
  const [showTx, setShowTx] = useState(false);
  const [txNoToShow, setTxNoToShow] = useState("");

  // Edit modal (collect tx + receipt)
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [prefillTx, setPrefillTx] = useState("");
  const [prefillReceipt, setPrefillReceipt] = useState("");

  // Confirm modal
  const [showConfirmPaid, setShowConfirmPaid] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [pendingItem, setPendingItem] = useState(null); // { txNo, payload, meta: { found } }

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);

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

  const previewPaid = (txNo, payload) => {
    const found =
      (pending || []).find(
        (p) =>
          String(p.tx_no).toLowerCase() === String(txNo).toLowerCase() ||
          String(p?.draft?.payment_tx_no || "").toLowerCase() === String(txNo).toLowerCase()
      ) || null;

    setPendingItem({ txNo, payload, meta: { found } });
    setConfirmError("");
    setShowConfirmPaid(true);
  };

  const onConfirmSubmit = async (ok) => {
    if (!ok) {
      setShowConfirmPaid(false);
      return;
    }
    if (!pendingItem) return;

    setConfirmSaving(true);
    setConfirmError("");
    try {
      await dispatch(
        markPaymentPaid({ txNo: pendingItem.txNo, payload: pendingItem.payload })
      ).unwrap();

      setShowConfirmPaid(false);
      dispatch(loadPendingPayments({}));
      setShowSuccess(true); // ✅ show success modal
    } catch (err) {
      const msg =
        (err?.response?.data?.message ||
          err?.message ||
          "Mark-paid failed") + "";
      setConfirmError(msg);
    } finally {
      setConfirmSaving(false);
    }
  };

  const backToEdit = () => {
    setShowConfirmPaid(false);
    setPrefillTx(pendingItem?.txNo || "");
    setPrefillReceipt(pendingItem?.payload?.receipt_no || "");
    setShowPaidModal(true);
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
                  setPrefillReceipt("");
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
                              setPrefillReceipt(""); // will auto-generate in modal
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

      {/* TX viewer */}
      <TxViewerModal show={showTx} txNo={txNoToShow} onHide={() => setShowTx(false)} />

      {/* Edit values first */}
      <MarkPaidModal
        show={showPaidModal}
        onHide={(ok) => {
          setShowPaidModal(false);
        }}
        defaultTxNo={prefillTx}
        defaultReceipt={prefillReceipt}
        onPreview={previewPaid}
      />

      {/* Confirm summary */}
      <ConfirmMarkPaidModal
        show={showConfirmPaid}
        onHide={onConfirmSubmit}
        item={pendingItem}
        isSaving={confirmSaving}
        error={confirmError}
        onBack={backToEdit}
      />

      {/* Success */}
      <SuccessModal
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="SUCCESS"
        message="We are delighted to inform you that we received your payment."
      />
    </section>
  );
}

// src/pages/issuance/sub/Transactions.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { loadTransactions } from "../../../features/issuance/issuanceSlice";
import { Button, Card, Table, Spinner, Row, Col, Form, InputGroup, Badge } from "react-bootstrap";
import { FaArrowLeft, FaSync } from "react-icons/fa";

export default function Transactions() {
  const dispatch = useDispatch();
  const { transactions, isLoadingTx } = useSelector((s) => s.issuance);

  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    dispatch(loadTransactions({}));
  }, [dispatch]);

  const filtered = useMemo(() => {
    let rows = transactions || [];
    if (status !== "All") rows = rows.filter((p) => (p.status || "") === status);
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) => {
        const d = p?.draft || {};
        return (
          (p.tx_no || "").toLowerCase().includes(needle) ||
          (d.payment_tx_no || "").toLowerCase().includes(needle) ||
          (d.type || "").toLowerCase().includes(needle) ||
          (d.purpose || "").toLowerCase().includes(needle) ||
          (p.receipt_no || "").toLowerCase().includes(needle)
        );
      });
    }
    return rows;
  }, [transactions, status, q]);

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <Button as={NavLink} to="/vc/issue" variant="outline-secondary">
          <FaArrowLeft className="me-2" />
          Back to Issuance
        </Button>
        <h1 className="h5 mb-0">Payment Transactions</h1>
        <Button variant="outline-primary" onClick={() => dispatch(loadTransactions({}))}>
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
                  placeholder="tx_no, purpose, type, receipt_no…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="text-end">
              <Form.Select
                style={{ maxWidth: 220, display: "inline-block" }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>All</option>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="consumed">consumed</option>
                <option value="void">void</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>TX No</th>
                  <th>Draft Type</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTx ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((p) => (
                    <tr key={p._id}>
                      <td><code>{p.tx_no}</code></td>
                      <td>{p?.draft?.type || "—"}</td>
                      <td>{p?.draft?.purpose || "—"}</td>
                      <td>{Number(p.amount).toFixed(2)} {p.currency || "PHP"}</td>
                      <td>
                        <Badge bg={
                          p.status === "paid" ? "success" :
                          p.status === "consumed" ? "dark" :
                          p.status === "void" ? "danger" : "secondary"
                        }>
                          {p.status}
                        </Badge>
                      </td>
                      <td>{p.receipt_no || "—"}</td>
                      <td>{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">No transactions.</td>
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

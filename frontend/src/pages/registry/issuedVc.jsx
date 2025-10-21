// src/pages/issuance/IssuedVc.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, Table, Button, Badge, Spinner, Modal } from "react-bootstrap";
import { FaQrcode, FaSync } from "react-icons/fa";
import { loadIssuedVCs, openClaimQrForVC, closeClaimModal } from "../../features/issuance/issuanceSlice";
import QRCode from "react-qr-code";

const fmt = (x) => (x ? new Date(x).toLocaleString() : "—");

export default function IssuedVc() {
  const dispatch = useDispatch();
  const { issuedVCs, isLoadingIssued, claimModal } = useSelector((s) => s.issuance);

  useEffect(() => { dispatch(loadIssuedVCs({})); }, [dispatch]);

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Issued Credentials</h1>
        <Button variant="outline-primary" onClick={() => dispatch(loadIssuedVCs({}))}>
          <FaSync className="me-2" /> Refresh
        </Button>
      </div>

      <Card>
        <Card.Header className="bg-light">
          <strong>All Signed VCs</strong>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student name</th>
                  <th>Student ID</th>
                  <th>Type</th>
                  <th>Issued at</th>
                  <th>Anchoring</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingIssued ? (
                  <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" className="me-2" />Loading…</td></tr>
                ) : (issuedVCs?.length || 0) > 0 ? (
                  issuedVCs.map((vc) => {
                    const subj = vc.vc_payload?.credentialSubject || {};
                    const anchor = vc?.anchoring?.state || "unanchored";
                    return (
                      <tr key={vc._id}>
                        <td>
                          <div className="fw-semibold">{subj.fullName || "—"}</div>
                          <div className="small text-muted">{subj.program || "—"}</div>
                        </td>
                        <td>{subj.studentNumber ? `#${subj.studentNumber}` : "—"}</td>
                        <td>{vc.template_id || "—"}</td>
                        <td>{fmt(vc.createdAt)}</td>
                        <td><Badge bg={anchor === "anchored" ? "success" : "secondary"}>{anchor}</Badge></td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-dark"
                            onClick={() => dispatch(openClaimQrForVC({ credId: vc._id }))}
                          >
                            <FaQrcode className="me-2" /> QR
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="text-center py-4">No issued credentials found.</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* QR Modal */}
      <Modal show={claimModal.open} onHide={() => dispatch(closeClaimModal())} centered>
        <Modal.Header closeButton><Modal.Title>Claim Credential</Modal.Title></Modal.Header>
        <Modal.Body className="text-center">
          {claimModal.error ? (
            <div className="text-danger">{claimModal.error}</div>
          ) : claimModal.claim_url ? (
            <>
              <div className="d-flex justify-content-center mb-3">
                <div style={{ background: "white", padding: 8 }}>
                  <QRCode value={claimModal.claim_url} size={240} />
                </div>
              </div>
              <div className="small text-muted mb-1">Scan or open this link:</div>
              <div className="mb-2" style={{ wordBreak: "break-all" }}>
                <code>{claimModal.claim_url}</code>
              </div>
              <div className="small text-muted">
                Expires: {fmt(claimModal.expires_at)} {claimModal.reused ? "(reused existing)" : ""}
              </div>
            </>
          ) : <Spinner animation="border" />}
        </Modal.Body>
      </Modal>
    </section>
  );
}

// src/features/draft_vc/modals/SuccessModal.jsx
import React from "react";
import { Modal, Button, Table } from "react-bootstrap";

function SuccessModal({ show, vcs, onClose }) {
  return (
    <Modal show={show} onHide={onClose} size="md">
      <Modal.Header closeButton>
        <Modal.Title>VCs Created Successfully!</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>The following VC drafts have been created:</p>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Student ID</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {vcs.map((vc, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{vc.studentId}</td>
                <td>{vc.type}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SuccessModal;

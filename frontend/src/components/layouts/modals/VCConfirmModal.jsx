// src/features/draft_vc/modals/VCConfirmModal.jsx
import React from "react";
import { Modal, Button, Table } from "react-bootstrap";

function VCConfirmModal({ show, vcs, onConfirm, onCancel }) {
  return (
    <Modal show={show} onHide={onCancel} size="md">
      <Modal.Header closeButton>
        <Modal.Title>Confirm VC Draft Creation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Are you sure you want to create the following VC drafts?</p>
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
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          ✅ Confirm & Create
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default VCConfirmModal;

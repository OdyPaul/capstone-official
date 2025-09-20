// src/components/ErrorModal.jsx
import React from "react";
import { Modal, Button } from "react-bootstrap";

function ErrorModal({ show, message, onClose }) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>Error</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ErrorModal;

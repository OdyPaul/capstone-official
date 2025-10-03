import React, { useState } from "react";
import { FaEye, FaTimes } from "react-icons/fa";
import { Modal, Button, Form, Card } from "react-bootstrap";

function KeyVaults() {
  const [showPublic, setShowPublic] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");

  // 🔑 Dummy keys
  const publicKey = "0xa1ADAC71aB9bB908034f4098dd1e77e0EAA0188b";
  const privateKey =
    "0xada1497c09b38a76c1888a28bc59fe50c0bdad2c06f1df925a78df9655a48585";

  const handlePrivateView = () => {
    if (showPrivate) {
      setShowPrivate(false);
      return;
    }
    setModalOpen(true);
  };

  const confirmPassword = () => {
    if (password === "1234") {
      setShowPrivate(true);
      setModalOpen(false);
      setPassword("");
    } else {
      alert("Incorrect password!");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Private and Public Key Vault</h2>

      {/* Public Key */}
      <Card className="mb-3 shadow-sm">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div>
            <Card.Title>Public Key</Card.Title>
            <Card.Text>
              {showPublic ? publicKey : "••••••••••••••••••••••••"}
            </Card.Text>
          </div>
          <Button
            variant="light"
            onClick={() => setShowPublic(!showPublic)}
            title={showPublic ? "Hide" : "Show"}
          >
            <FaEye />
          </Button>
        </Card.Body>
      </Card>

      {/* Private Key */}
      <Card className="shadow-sm">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div>
            <Card.Title>Private Key</Card.Title>
            <Card.Text>
              {showPrivate ? privateKey : "••••••••••••••••••••••••"}
            </Card.Text>
          </div>
          <Button
            variant="light"
            onClick={handlePrivateView}
            title={showPrivate ? "Hide" : "Show (Password Required)"}
          >
            <FaEye />
          </Button>
        </Card.Body>
      </Card>

      {/* Password Modal */}
      <Modal show={modalOpen} onHide={() => setModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Enter Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            <FaTimes className="me-1" /> Cancel
          </Button>
          <Button variant="primary" onClick={confirmPassword}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default KeyVaults;

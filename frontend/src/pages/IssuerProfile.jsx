// src/pages/accounts/IssuerProfile.jsx
import React, { useMemo } from 'react';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
// ⬇️ adjust the path if your assets folder differs
import psauLogo from '../assets/psau_logo.png';

const EXPLORERS = {
  amoy: {
    label: 'Polygon Amoy',
    addr: (a) => `https://amoy.polygonscan.com/address/${a}`,
    tx:   (h) => `https://amoy.polygonscan.com/tx/${h}`,
  },
  polygon: {
    label: 'Polygon',
    addr: (a) => `https://polygonscan.com/address/${a}`,
    tx:   (h) => `https://polygonscan.com/tx/${h}`,
  },
};

const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' };

function copy(text) {
  if (!text) return;
  navigator?.clipboard?.writeText?.(String(text)).catch(() => {/* noop */});
}

function titleize(s = '') {
  return s
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IssuerProfile() {
  // Read from Vite .env
  const ISSUER_NAME  = import.meta.env.VITE_ISSUER_NAME || '';
  const ISSUER_DID   = import.meta.env.VITE_ISSUER_DID || '';
  const ANCHOR_ADDR  = import.meta.env.VITE_MERKLE_ANCHOR_ADDRESS || '';
  const SMTP_FROM    = import.meta.env.VITE_SMTP || '';

  const prettyName = useMemo(() => titleize(ISSUER_NAME), [ISSUER_NAME]);

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">
          Issuer Profile <Badge bg="secondary" className="ms-2">University</Badge>
        </h1>
      </div>

      {/* Header card with logo & name */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center g-3">
            <Col md="auto">
              <img
                src={psauLogo}
                alt="PSAU Logo"
                style={{ width: 80, height: 80, objectFit: 'contain' }}
              />
            </Col>
            <Col>
              <div className="text-muted" style={{ fontSize: 12 }}>Issuer</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{prettyName || ISSUER_NAME || '—'}</div>
              {ISSUER_NAME && ISSUER_NAME !== prettyName ? (
                <div className="text-muted" style={{ fontSize: 12 }}>
                  <span style={mono}>{ISSUER_NAME}</span>
                </div>
              ) : null}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Details card */}
      <Card className="mb-4">
        <Card.Header className="bg-light"><strong>Issuer Details</strong></Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={4} className="text-muted">Issuer DID / Public Address</Col>
            <Col md={8} className="d-flex align-items-center gap-2">
              <span style={{ ...mono, wordBreak: 'break-all' }}>{ISSUER_DID || '—'}</span>
              {!!ISSUER_DID && (
                <>
                  <Button size="sm" variant="outline-secondary" onClick={() => copy(ISSUER_DID)} title="Copy DID">
                    <FaCopy className="me-1" /> Copy
                  </Button>
                  <a
                    href={EXPLORERS.amoy.addr(ISSUER_DID)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-primary"
                    title={`View on ${EXPLORERS.amoy.label}`}
                  >
                    Amoy <FaExternalLinkAlt className="ms-1" />
                  </a>
                  <a
                    href={EXPLORERS.polygon.addr(ISSUER_DID)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-primary"
                    title={`View on ${EXPLORERS.polygon.label}`}
                  >
                    Polygon <FaExternalLinkAlt className="ms-1" />
                  </a>
                </>
              )}
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4} className="text-muted">Merkle Anchor Contract</Col>
            <Col md={8} className="d-flex align-items-center gap-2">
              <span style={{ ...mono, wordBreak: 'break-all' }}>{ANCHOR_ADDR || '—'}</span>
              {!!ANCHOR_ADDR && (
                <>
                  <Button size="sm" variant="outline-secondary" onClick={() => copy(ANCHOR_ADDR)} title="Copy contract">
                    <FaCopy className="me-1" /> Copy
                  </Button>
                  <a
                    href={EXPLORERS.amoy.addr(ANCHOR_ADDR)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-primary"
                    title={`View on ${EXPLORERS.amoy.label}`}
                  >
                    Amoy <FaExternalLinkAlt className="ms-1" />
                  </a>
                  <a
                    href={EXPLORERS.polygon.addr(ANCHOR_ADDR)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-primary"
                    title={`View on ${EXPLORERS.polygon.label}`}
                  >
                    Polygon <FaExternalLinkAlt className="ms-1" />
                  </a>
                </>
              )}
            </Col>
          </Row>

          <Row className="mb-1">
            <Col md={4} className="text-muted">SMTP From</Col>
            <Col md={8}>
              <span style={mono}>{SMTP_FROM || '—'}</span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Note card */}
      <Card>
        <Card.Body className="text-muted">
          This page is read-only. Values are sourced from your <span style={mono}>.env.local</span>:
          <div className="mt-2" style={mono}>
            VITE_ISSUER_NAME, VITE_ISSUER_DID, VITE_MERKLE_ANCHOR_ADDRESS, VITE_SMTP
          </div>
        </Card.Body>
      </Card>
    </section>
  );
}

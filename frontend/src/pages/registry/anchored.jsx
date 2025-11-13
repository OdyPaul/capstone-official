// src/pages/Anchored.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Table,
  Badge,
  Button,
  Spinner,
  Modal,
} from "react-bootstrap";
import { NavLink } from "react-router-dom";
import { FaArrowLeft, FaExternalLinkAlt } from "react-icons/fa";
import { MERKLE_ANCHOR_ADDRESS } from "../../../config";
import {
  loadAnchorBatches,
  selectAnchored,
  selectIsLoadingAnchored,
} from "../../features/anchor/anchorSlice";

const EXPLORERS = {
  80002: {
    label: "Polygon Amoy",
    addr: (a) => `https://amoy.polygonscan.com/address/${a}`,
    tx: (h) => `https://amoy.polygonscan.com/tx/${h}`,
  },
  137: {
    label: "Polygon",
    addr: (a) => `https://polygonscan.com/address/${a}`,
    tx: (h) => `https://polygonscan.com/tx/${h}`,
  },
};

const short = (x) => (x ? `${x.slice(0, 6)}...${x.slice(-4)}` : "—");
const fmt = (x) => (x ? new Date(x).toLocaleString() : "—");

export default function Anchored() {
  const dispatch = useDispatch();
  const rows = useSelector(selectAnchored);
  const loading = useSelector(selectIsLoadingAnchored);

  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchRows = () => dispatch(loadAnchorBatches({ limit: 200 }));

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enriched = useMemo(
    () =>
      Array.isArray(rows)
        ? rows.map((r) => ({
            ...r,
            explorer: EXPLORERS[r.chain_id] || null,
          }))
        : [],
    [rows]
  );

  const firstExplorer =
    enriched[0]?.explorer || EXPLORERS[80002] || null;

  const openDetails = (row) => {
    setSelected(row);
    setShowModal(true);
  };

  const closeDetails = () => {
    setShowModal(false);
    setSelected(null);
  };

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Button
            as={NavLink}
            to="/registry/anchor"
            variant="outline-secondary"
          >
            <FaArrowLeft className="me-2" />
            Back to Anchor
          </Button>
          <h1 className="h4 mb-0">Anchored</h1>
        </div>
        <Button variant="outline-primary" onClick={fetchRows}>
          Refresh {loading && <Spinner size="sm" className="ms-2" />}
        </Button>
      </div>

      {/* Constant contract (“To: …”) */}
      <Card className="mb-3">
        <Card.Body className="d-flex flex-wrap align-items-center gap-3">
          <div>
            <strong>Contract</strong>
          </div>
          <div className="text-monospace">
            {short(MERKLE_ANCHOR_ADDRESS)}
          </div>
          <Badge bg="success">Active</Badge>
          {firstExplorer && MERKLE_ANCHOR_ADDRESS ? (
            <a
              href={firstExplorer.addr(MERKLE_ANCHOR_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="ms-auto d-flex align-items-center gap-1"
            >
              <FaExternalLinkAlt /> View on Polygonscan
            </a>
          ) : null}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="bg-light">
          <strong>Recent Batches</strong>
        </Card.Header>
        <Card.Body className="pt-0">
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>B. Date</th>
                  <th>Count VC</th>
                  <th>Batch ID</th>
                  <th>Merkle Root</th>
                  <th>Tx</th>
                  <th>Chain</th>
                  <th style={{ width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" /> Loading…
                    </td>
                  </tr>
                ) : enriched.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-muted py-4"
                    >
                      No anchored batches yet.
                    </td>
                  </tr>
                ) : (
                  enriched.map((r) => (
                    <tr
                      key={r.batch_id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetails(r)}
                    >
                      <td>{fmt(r.anchored_at || r.createdAt)}</td>
                      <td>{r.count ?? "—"}</td>
                      <td className="text-monospace">
                        {short(r.batch_id)}
                      </td>
                      <td className="text-monospace">
                        {short(r.merkle_root)}
                      </td>
                      <td className="text-monospace">
                        {r.explorer ? (
                          <a
                            href={r.explorer.tx(r.tx_hash)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {short(r.tx_hash)}
                          </a>
                        ) : (
                          short(r.tx_hash)
                        )}
                      </td>
                      <td>{r.explorer ? r.explorer.label : r.chain_id}</td>
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(r);
                        }}
                        className="text-end"
                      >
                        <Button
                          size="sm"
                          variant="outline-primary"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <DetailsModal
        show={showModal}
        onHide={closeDetails}
        batch={selected}
      />
    </section>
  );
}

// -------------------- Details Modal --------------------
function DetailsModal({ show, onHide, batch }) {
  if (!batch) return null;

  const explorer = batch.explorer || EXPLORERS[batch.chain_id] || null;
  const anchoredAt = fmt(batch.anchored_at || batch.createdAt);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Batch Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <dl className="row mb-0">
          <dt className="col-sm-3">Anchored At</dt>
          <dd className="col-sm-9">{anchoredAt}</dd>

          <dt className="col-sm-3">Count VC</dt>
          <dd className="col-sm-9">{batch.count ?? "—"}</dd>

          <dt className="col-sm-3">Batch ID</dt>
          <dd className="col-sm-9 text-monospace">
            {batch.batch_id || "—"}
          </dd>

          <dt className="col-sm-3">Merkle Root</dt>
          <dd className="col-sm-9 text-monospace">
            {batch.merkle_root || "—"}
          </dd>

          <dt className="col-sm-3">Tx Hash</dt>
          <dd className="col-sm-9 text-monospace">
            {explorer ? (
              <a
                href={explorer.tx(batch.tx_hash)}
                target="_blank"
                rel="noreferrer"
              >
                {batch.tx_hash}
              </a>
            ) : (
              batch.tx_hash || "—"
            )}
          </dd>

          <dt className="col-sm-3">Chain</dt>
          <dd className="col-sm-9">
            {explorer ? explorer.label : batch.chain_id}
          </dd>

          <dt className="col-sm-3">Contract</dt>
          <dd className="col-sm-9 text-monospace">
            {MERKLE_ANCHOR_ADDRESS || "—"}
            {explorer && MERKLE_ANCHOR_ADDRESS ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={explorer.addr(MERKLE_ANCHOR_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View contract
                </a>
              </>
            ) : null}
          </dd>
        </dl>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

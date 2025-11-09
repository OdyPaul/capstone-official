import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, Table, Badge, Button, Spinner } from "react-bootstrap";
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

  const fetchRows = () => dispatch(loadAnchorBatches({ limit: 200 }));

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enriched = useMemo(
    () => (Array.isArray(rows) ? rows.map((r) => ({ ...r, explorer: EXPLORERS[r.chain_id] || null })) : []),
    [rows]
  );

  return (
    <section className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Anchored</h1>
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
          <div className="text-monospace">{MERKLE_ANCHOR_ADDRESS}</div>
          <Badge bg="success">Active</Badge>
          <a
            href={EXPLORERS[80002].addr(MERKLE_ANCHOR_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="ms-auto"
          >
            View on Polygonscan
          </a>
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
                  <th>Anchored At</th>
                  <th>Merkle Root</th>
                  <th>Tx</th>
                  <th>Batch ID</th>
                  <th>Count</th>
                  <th>Chain</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" /> Loading…
                    </td>
                  </tr>
                ) : enriched.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No anchored batches yet.
                    </td>
                  </tr>
                ) : (
                  enriched.map((r) => (
                    <tr key={r.batch_id}>
                      <td>{fmt(r.anchored_at || r.createdAt)}</td>
                      <td className="text-monospace">{r.merkle_root}</td>
                      <td>
                        {r.explorer ? (
                          <a href={r.explorer.tx(r.tx_hash)} target="_blank" rel="noreferrer">
                            {short(r.tx_hash)}
                          </a>
                        ) : (
                          short(r.tx_hash)
                        )}
                      </td>
                      <td className="text-monospace">{r.batch_id}</td>
                      <td>{r.count ?? "—"}</td>
                      <td>{r.explorer ? r.explorer.label : r.chain_id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </section>
  );
}

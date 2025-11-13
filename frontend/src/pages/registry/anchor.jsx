// src/pages/Anchor.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Form,
  InputGroup,
  Modal,
  Alert,
} from "react-bootstrap";
import {
  FaSync,
  FaSearch,
  FaAnchor,
  FaCog,
  FaArrowLeft,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

import {
  loadAnchorCandidates,
  mintSelectedBatch,
  selectAnchorCandidates,
  selectIsLoadingCandidates,
  selectAnchorState,
} from "../../features/anchor/anchorSlice";

const fmt = (x) => (x ? new Date(x).toLocaleString() : "—");

// -------------------- Filters --------------------
const DEFAULTS = { q: "", range: "1m", queue: "all" };
const RANGE_OPTS = ["All", "today", "1w", "1m", "6m"];
const QUEUE_OPTS = [
  { v: "all", label: "All" },
  { v: "queued", label: "Queued" },
  { v: "not_queued", label: "Not queued" },
];

function normParams({ q, range, queue }) {
  const out = {};
  const qq = String(q || "").trim();
  if (qq) out.q = qq;
  if (range && range !== "All") out.range = range;
  if (queue && queue !== "all") out.queue = queue;
  return out;
}

const queueLabel = (v) =>
  v === "queued" ? "Queued" : v === "not_queued" ? "Not queued" : "All";

// -------------------- Page --------------------
export default function Anchor() {
  const dispatch = useDispatch();

  // Filter UI
  const [q, setQ] = useState(DEFAULTS.q);
  const [range, setRange] = useState(DEFAULTS.range);
  const [queue, setQueue] = useState(DEFAULTS.queue);
  const [showSettings, setShowSettings] = useState(false);

  // Flash message
  const [flash, setFlash] = useState(null);

  // Data from store
  const rows = useSelector(selectAnchorCandidates);
  const isLoading = useSelector(selectIsLoadingCandidates);
  const { isMinting, isError, message, lastAction } =
    useSelector(selectAnchorState);

  // Selection
  const [selected, setSelected] = useState({});
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const clearSel = () => setSelected({});

  const allSelected = useMemo(() => {
    if (!rows || !rows.length) return false;
    return rows.every((r) => selected[r._id]);
  }, [rows, selected]);

  const toggleSel = (id, checked) =>
    setSelected((s) => ({ ...s, [id]: !!checked }));

  const toggleRow = (id) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const toggleAll = (checked) => {
    if (!rows || !rows.length) return;
    if (!checked) return clearSel();
    const next = {};
    for (const r of rows) next[r._id] = true;
    setSelected(next);
  };

  // Load candidates
  const apply = useCallback(() => {
    dispatch(loadAnchorCandidates(normParams({ q, range, queue })));
  }, [dispatch, q, range, queue]);

  const reset = useCallback(() => {
    setQ(DEFAULTS.q);
    setRange(DEFAULTS.range);
    setQueue(DEFAULTS.queue);
    dispatch(loadAnchorCandidates(normParams(DEFAULTS)));
  }, [dispatch]);

  useEffect(() => {
    apply();
  }, [apply]);

  // Flash messages from slice
  useEffect(() => {
    if (lastAction) {
      setFlash({
        type: "success",
        text: lastAction.message || "Done.",
      });
      const t = setTimeout(() => setFlash(null), 2500);
      return () => clearTimeout(t);
    }
  }, [lastAction]);

  useEffect(() => {
    if (isError && message) {
      setFlash({ type: "danger", text: String(message) });
    }
  }, [isError, message]);

  // Mint selected (batch, even if only 1)
  const onMintSelected = async () => {
    if (!selectedIds.length) {
      setFlash({
        type: "danger",
        text: "Select at least one credential.",
      });
      return;
    }
    try {
      await dispatch(
        mintSelectedBatch({
          credIds: selectedIds,
          filters: normParams({ q, range, queue }),
        })
      ).unwrap();
      clearSel();
      setFlash({
        type: "success",
        text:
          selectedIds.length === 1
            ? "Anchored 1 credential in a batch."
            : `Anchored ${selectedIds.length} credentials in a batch.`,
      });
    } catch (err) {
      setFlash({
        type: "danger",
        text: String(err),
      });
    }
  };

  const Busy = ({ when }) =>
    when ? (
      <Spinner animation="border" size="sm" className="ms-2" />
    ) : null;

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Anchor Credentials</h1>
        <div className="d-flex gap-2">
          <Button
            as={NavLink}
            to="/registry/issuedVc"
            variant="outline-secondary"
          >
            <FaArrowLeft className="me-2" /> Back to Issued
          </Button>
          <Button
            as={NavLink}
            to="/registry/anchored"
            variant="success"
          >
            View Anchored
          </Button>
          <Button variant="outline-primary" onClick={apply}>
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* flash */}
      {flash ? (
        <Alert
          variant={flash.type}
          onClose={() => setFlash(null)}
          dismissible
          className="mb-3"
        >
          {flash.text}
        </Alert>
      ) : null}

      {/* toolbar */}
      <Card className="mb-3">
        <Card.Body className="pb-2">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
            className="w-100"
          >
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search name, student no., template…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button type="submit" variant="primary">
                Apply
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={reset}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline-dark"
                title="Filter settings"
                onClick={() => setShowSettings(true)}
              >
                <FaCog />
              </Button>
            </InputGroup>
          </Form>

          <div className="mt-2 d-flex flex-wrap gap-2 align-items-center">
            <Badge bg="light" text="dark">
              Range: {range}
            </Badge>
            <Badge bg="light" text="dark">
              Queue: {queueLabel(queue)}
            </Badge>
            {q ? (
              <Badge bg="light" text="dark">
                q: {q}
              </Badge>
            ) : null}

            <div className="ms-auto d-flex gap-2">
              <Button
                size="sm"
                variant="success"
                disabled={!selectedIds.length || isMinting}
                onClick={onMintSelected}
              >
                <FaAnchor className="me-2" />
                Anchor selected{" "}
                {selectedIds.length
                  ? `(${selectedIds.length})`
                  : ""}
                <Busy when={isMinting} />
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* table */}
      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <div>
            <strong>Issued (not anchored)</strong>{" "}
            <Badge bg="secondary" className="ms-1">
              {rows?.length || 0}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>
                    <Form.Check
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th>Student name</th>
                  <th>Student ID</th>
                  <th>Type</th>
                  <th>Issued at</th>
                  <th>Queue</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" className="me-2" />{" "}
                      Loading…
                    </td>
                  </tr>
                ) : !rows || !rows.length ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No unanchored credentials found. Try adjusting
                      filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((vc) => {
                    const id = vc._id;
                    const subj =
                      vc.vc_payload?.credentialSubject || {};
                    const anchor = vc.anchoring || {};
                    const isQueued = anchor.state === "queued";
                    const queueMode = anchor.queue_mode || "—";

                    return (
                      <tr
                        key={id}
                        onClick={() => toggleRow(id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Form.Check
                            type="checkbox"
                            checked={!!selected[id]}
                            onChange={(e) =>
                              toggleSel(id, e.target.checked)
                            }
                          />
                        </td>
                        <td>
                          <div className="fw-semibold">
                            {subj.fullName || "—"}
                          </div>
                          <div className="small text-muted">
                            {subj.program || "—"}
                          </div>
                        </td>
                        <td>
                          {subj.studentNumber
                            ? `#${subj.studentNumber}`
                            : "—"}
                        </td>
                        <td>{vc.template_id || "—"}</td>
                        <td>{fmt(vc.createdAt)}</td>
                        <td>
                          {isQueued ? (
                            <Badge bg="info">
                              queued ({queueMode})
                            </Badge>
                          ) : (
                            <Badge
                              bg="light"
                              text="dark"
                            >
                              not queued
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <FilterModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        q={q}
        setQ={setQ}
        range={range}
        setRange={setRange}
        queue={queue}
        setQueue={setQueue}
        onApply={() => {
          setShowSettings(false);
          apply();
        }}
      />
    </section>
  );
}

// -------------------- Filter Modal --------------------
function FilterModal({
  show,
  onClose,
  q,
  setQ,
  range,
  setRange,
  queue,
  setQueue,
  onApply,
}) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Anchor Filters</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form className="d-grid gap-3">
          <div>
            <Form.Label>Range</Form.Label>
            <Form.Select
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {RANGE_OPTS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Form.Select>
          </div>
          <div>
            <Form.Label>Queue</Form.Label>
            <Form.Select
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
            >
              {QUEUE_OPTS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </div>
          <div>
            <Form.Label>Search</Form.Label>
            <Form.Control
              placeholder="Name, student no., template…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onApply}>
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

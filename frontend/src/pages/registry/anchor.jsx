// src/pages/Anchor.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card, Table, Button, Badge, Spinner, Form, InputGroup, ButtonGroup, Alert,
} from "react-bootstrap";
import {
  FaSync, FaSearch, FaAnchor, FaPlay, FaLayerGroup, FaCheck, FaFilter, FaArrowLeft,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

import {
  enqueueAnchorNow,
  loadAnchorQueue,
  approveQueued,
  runSingleAnchor,
  mintBatch,
  loadRecentNonAnchor,
  selectQueue,
  selectQueueToday,
  selectRecent15,
  selectRecent30,
} from "../../features/anchor/anchorSlice";

const fmt = (x) => (x ? new Date(x).toLocaleString() : "—");

export default function Anchor() {
  const dispatch = useDispatch();

  // queue filters
  const [queueMode, setQueueMode] = useState("now"); // 'now' | 'batch' | 'all'
  const [approved, setApproved] = useState("all");   // 'all' | 'true' | 'false'

  // enqueue input
  const [credId, setCredId] = useState("");
  const [flash, setFlash] = useState(null);

  const queue      = useSelector(selectQueue);
  const queueToday = useSelector(selectQueueToday);
  const recent15   = useSelector(selectRecent15);
  const recent30   = useSelector(selectRecent30);

  const {
    isLoadingQueue,
    isRequestingNow,
    isApproving,
    isRunningSingle,
    isMinting,
    isLoadingRecent15,
    isLoadingRecent30,
    isError,
    message,
    lastAction,
  } = useSelector((s) => s.anchor);

  // initial loads
  const applyQueue = useCallback(() => {
    dispatch(loadAnchorQueue({ mode: queueMode, approved }));
  }, [dispatch, queueMode, approved]);

  useEffect(() => { applyQueue(); }, [applyQueue]);
  useEffect(() => {
    dispatch(loadRecentNonAnchor({ days: 15 }));
    dispatch(loadRecentNonAnchor({ days: 30 }));
  }, [dispatch]);

  // flash messages
  useEffect(() => {
    if (lastAction) {
      setFlash({ type: "success", text: lastAction.message || "Done." });
      const t = setTimeout(() => setFlash(null), 2500);
      return () => clearTimeout(t);
    }
  }, [lastAction]);
  useEffect(() => {
    if (isError && message) setFlash({ type: "danger", text: String(message) });
  }, [isError, message]);

  // selection
  const [selected, setSelected] = useState({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const toggleSel = (id, checked) => setSelected((s) => ({ ...s, [id]: !!checked }));
  const clearSel = () => setSelected({});

  // actions
  const onEnqueue = async (e) => {
    e.preventDefault();
    const id = (credId || "").trim();
    if (!id) { setFlash({ type: "danger", text: "Enter a Credential ID." }); return; }
    try {
      await dispatch(enqueueAnchorNow({ credId: id })).unwrap();
      setCredId("");
      setFlash({ type: "success", text: "Queued for NOW review." });
    } catch (err) {
      setFlash({ type: "danger", text: String(err) });
    }
  };

  const onApprove = async (mode) => {
    if (!selectedIds.length) return;
    try {
      await dispatch(approveQueued({ credIds: selectedIds, approved_mode: mode })).unwrap();
      clearSel();
      setFlash({ type: "success", text: `Approved for ${mode}.` });
    } catch (err) {
      setFlash({ type: "danger", text: String(err) });
    }
  };

  const onRunSingle = async (id) => {
    try {
      await dispatch(runSingleAnchor({ credId: id })).unwrap();
      setFlash({ type: "success", text: "Anchored (single)." });
    } catch (err) {
      setFlash({ type: "danger", text: String(err) });
    }
  };

  const onMintEODNow = async () => {
    try {
      await dispatch(mintBatch({ mode: "now" })).unwrap(); // EOD: only Anchor-Now approved items
      clearSel();
      setFlash({ type: "success", text: "Anchored (batch, now)." });
    } catch (err) {
      setFlash({ type: "danger", text: String(err) });
    }
  };

  const Busy = ({ when }) => (when ? <Spinner animation="border" size="sm" className="ms-2" /> : null);
  const Pill = ({ active, onClick, children }) => (
    <Button size="sm" variant={active ? "primary" : "outline-secondary"} className="me-2" onClick={onClick}>
      {children}
    </Button>
  );

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Anchor VC</h1>
        <div className="d-flex gap-2">
          <Button as={NavLink} to="/registry/issuedVc" variant="outline-secondary">
            <FaArrowLeft className="me-2" /> Back to Issued
          </Button>
            <Button as={NavLink} to="/registry/anchored" variant="success">
                View Anchored
          </Button>
          <Button variant="outline-primary" onClick={applyQueue}>
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* enqueue toolbar */}
      <Card className="mb-3">
        <Card.Header className="bg-light"><strong>Queue “Anchor Now” (no immediate mint)</strong></Card.Header>
        <Card.Body>
          {flash ? (
            <Alert variant={flash.type} onClose={() => setFlash(null)} dismissible className="mb-3">
              {flash.text}
            </Alert>
          ) : null}

          <Form onSubmit={onEnqueue} className="w-100">
            <InputGroup>
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control
                placeholder="Credential ID…"
                value={credId}
                onChange={(e) => setCredId(e.target.value)}
              />
              <Button type="submit" variant="success" disabled={isRequestingNow}>
                <FaAnchor className="me-2" /> Queue Now <Busy when={isRequestingNow} />
              </Button>
              <Button type="button" variant="outline-secondary" onClick={applyQueue}>
                <FaSync className="me-2" /> Refresh <Busy when={isLoadingQueue} />
              </Button>
            </InputGroup>

            <div className="mt-2 d-flex flex-wrap gap-2">
              <Badge bg="light" text="dark">Today queued: {queueToday.length}</Badge>
              <Badge bg="light" text="dark">Queue size: {queue.length}</Badge>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* queue list */}
      <Card className="mb-3">
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <div><strong>Queue</strong> <Badge bg="secondary" className="ms-1">{queue.length}</Badge></div>
          <div className="d-flex align-items-center">
            <FaFilter className="me-2 text-muted" />
            <ButtonGroup className="me-2">
              <Pill active={queueMode === "now"} onClick={() => setQueueMode("now")}>NOW</Pill>
              <Pill active={queueMode === "batch"} onClick={() => setQueueMode("batch")}>Batch</Pill>
              <Pill active={queueMode === "all"} onClick={() => setQueueMode("all")}>All</Pill>
            </ButtonGroup>
            <ButtonGroup>
              <Pill active={approved === "all"} onClick={() => setApproved("all")}>Any</Pill>
              <Pill active={approved === "true"} onClick={() => setApproved("true")}>Approved</Pill>
              <Pill active={approved === "false"} onClick={() => setApproved("false")}>Unapproved</Pill>
            </ButtonGroup>
          </div>
        </Card.Header>
        <Card.Body className="pt-0">
          <div className="d-flex justify-content-between align-items-center my-2">
            <div className="d-flex gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                disabled={!selectedIds.length || isApproving}
                onClick={() => onApprove("single")}
              >
                <FaCheck className="me-2" /> Approve Single <Busy when={isApproving} />
              </Button>
              <Button
                size="sm"
                variant="outline-primary"
                disabled={!selectedIds.length || isApproving}
                onClick={() => onApprove("batch")}
              >
                <FaLayerGroup className="me-2" /> Approve Batch <Busy when={isApproving} />
              </Button>
            </div>
            <div>
              <Button size="sm" variant="success" onClick={onMintEODNow} disabled={isMinting}>
                <FaAnchor className="me-2" /> EOD Mint (NOW) <Busy when={isMinting} />
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <Table hover size="sm" className="align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Credential</th>
                  <th>Template</th>
                  <th>Queue</th>
                  <th>Approved</th>
                  <th>Requested</th>
                  <th>Created</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoadingQueue ? (
                  <tr><td colSpan={8} className="text-center py-5"><Spinner animation="border" /> Loading…</td></tr>
                ) : queue.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No queued items.</td></tr>
                ) : queue.map((row) => {
                  const id = row?._id;
                  const a = row?.anchoring || {};
                  const reqAt = a.requested_at ? new Date(a.requested_at) : null;
                  const created = row?.createdAt ? new Date(row.createdAt) : null;
                  const approvedMode = a.approved_mode || null;
                  const canRunSingle = approvedMode === "single";
                  return (
                    <tr key={id}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={!!selected[id]}
                          onChange={(e) => toggleSel(id, e.target.checked)}
                        />
                      </td>
                      <td className="text-monospace">{id}</td>
                      <td>{row?.template_id || "—"}</td>
                      <td><Badge bg={a.queue_mode === "now" ? "primary" : "secondary"}>{a.queue_mode || "—"}</Badge></td>
                      <td>{approvedMode ? <Badge bg={approvedMode === "single" ? "info" : "dark"}>{approvedMode}</Badge> : "—"}</td>
                      <td>{reqAt ? fmt(reqAt) : "—"}</td>
                      <td>{created ? fmt(created) : "—"}</td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={!canRunSingle || isRunningSingle}
                          onClick={() => onRunSingle(id)}
                        >
                          <FaPlay className="me-1" /> Run Single
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* non-now lists */}
      <Card>
        <Card.Header className="bg-light"><strong>Non-Anchor-Now (recent signed)</strong></Card.Header>
        <Card.Body>
          <div className="d-flex gap-3 mb-3">
            <Badge bg="secondary">Last 15 days: {isLoadingRecent15 ? "…" : (recent15?.length || 0)}</Badge>
            <Badge bg="secondary">15–30 days: {isLoadingRecent30 ? "…" : (recent30?.length || 0)}</Badge>
          </div>

          <div className="row">
            <div className="col-md-6">
              <h6 className="mb-2">Last 15 days</h6>
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle">
                  <thead className="table-light">
                    <tr><th>Credential</th><th>Template</th><th>Created</th><th /></tr>
                  </thead>
                  <tbody>
                    {isLoadingRecent15 ? (
                      <tr><td colSpan={4} className="text-center py-3"><Spinner animation="border" /></td></tr>
                    ) : (recent15 || []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted py-3">No items.</td></tr>
                    ) : recent15.map(vc => (
                      <tr key={vc?._id}>
                        <td className="text-monospace">{vc?._id}</td>
                        <td>{vc?.template_id || "—"}</td>
                        <td>{fmt(vc?.createdAt)}</td>
                        <td className="text-end">
                          <Button size="sm" variant="outline-success" onClick={() => setCredId(vc?._id || "")}>
                            Queue Now
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
            <div className="col-md-6">
              <h6 className="mb-2">15–30 days</h6>
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle">
                  <thead className="table-light">
                    <tr><th>Credential</th><th>Template</th><th>Created</th><th /></tr>
                  </thead>
                  <tbody>
                    {isLoadingRecent30 ? (
                      <tr><td colSpan={4} className="text-center py-3"><Spinner animation="border" /></td></tr>
                    ) : (recent30 || []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted py-3">No items.</td></tr>
                    ) : recent30.map(vc => (
                      <tr key={vc?._id}>
                        <td className="text-monospace">{vc?._id}</td>
                        <td>{vc?.template_id || "—"}</td>
                        <td>{fmt(vc?.createdAt)}</td>
                        <td className="text-end">
                          <Button size="sm" variant="outline-success" onClick={() => setCredId(vc?._id || "")}>
                            Queue Now
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </section>
  );
}

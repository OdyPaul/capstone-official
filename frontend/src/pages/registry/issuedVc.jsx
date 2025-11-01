import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card, Table, Button, Badge, Spinner, Modal, Form, InputGroup,
} from "react-bootstrap";
import {
  FaQrcode, FaSync, FaRegCopy, FaExternalLinkAlt, FaDownload, FaSearch, FaCog,
} from "react-icons/fa";
import QRCode from "qrcode";
import {
  loadIssuedVCs,
  openClaimQrForVC,
  closeClaimModal,
} from "../../features/issuance/issuanceSlice";

const fmt = (x) => (x ? new Date(x).toLocaleString() : "—");

// -------------------- Filters --------------------
const DEFAULTS = { q: "", range: "1m", claimed: "claimable" }; // sensible defaults
const CLAIMED_OPTS = [
  { v: "all", label: "All" },
  { v: "claimable", label: "Claimable" }, // claimed=false
  { v: "claimed", label: "Claimed" },     // claimed=true
];
const RANGE_OPTS = ["All", "today", "1w", "1m", "6m"];

function normParams({ q, range, claimed }) {
  const out = {};
  if (q) out.q = q;
  if (range && range !== "All") out.range = range;
  if (claimed === "claimed") out.claimed = "true";
  if (claimed === "claimable") out.claimed = "false";
  return out;
}

// -------------------- Page --------------------
export default function IssuedVc() {
  const dispatch = useDispatch();
  const { issuedVCs, isLoadingIssued } = useSelector((s) => s.issuance);

  // local filter state
  const [q, setQ] = useState(DEFAULTS.q);
  const [range, setRange] = useState(DEFAULTS.range);
  const [claimed, setClaimed] = useState(DEFAULTS.claimed);
  const [showSettings, setShowSettings] = useState(false);
  const claimModalOpen = useSelector((s) => s.issuance.claimModal.open);
  const wasOpenRef = useRef(false);
  useEffect(() => {
  if (wasOpenRef.current && !claimModalOpen) {
    // modal just closed → re-apply current filters
    dispatch(loadIssuedVCs(normParams({ q, range, claimed })));
  }
  wasOpenRef.current = claimModalOpen;
}, [claimModalOpen, dispatch, q, range, claimed]); 
  const apply = useCallback(() => {
    dispatch(loadIssuedVCs(normParams({ q, range, claimed })));
  }, [dispatch, q, range, claimed]);

  const reset = useCallback(() => {
    setQ(DEFAULTS.q);
    setRange(DEFAULTS.range);
    setClaimed(DEFAULTS.claimed);
    dispatch(loadIssuedVCs(normParams(DEFAULTS)));
  }, [dispatch]);

  useEffect(() => {
    apply();
  }, []); // initial load

  const rows = issuedVCs || [];

  return (
    <section className="container py-4">
      {/* header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Issued Credentials</h1>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={apply}>
            <FaSync className="me-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* toolbar (similar to Drafts) */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                apply();
              }}
              className="flex-grow-1"
            >
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Search name, student no., type…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button type="submit" variant="primary">Apply</Button>
                <Button type="button" variant="outline-secondary" onClick={reset}>Reset</Button>
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

            {/* active filter badges */}
            <div className="ms-auto d-flex gap-2 flex-wrap">
              <Badge bg="light" text="dark">Range: {range}</Badge>
              <Badge bg="light" text="dark">
                Status: {claimed === "claimed" ? "Claimed" : claimed === "claimable" ? "Claimable" : "All"}
              </Badge>
              {q ? <Badge bg="light" text="dark">q: {q}</Badge> : null}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* table */}
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
                  <th>Status</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingIssued ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" className="me-2" /> Loading…
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((vc) => {
                    const subj = vc.vc_payload?.credentialSubject || {};
                    const anchor = vc?.anchoring?.state || "unanchored";
                    const isClaimed = !!vc?.claimed_at;

                    return (
                      <tr key={vc._id}>
                        <td>
                          <div className="fw-semibold">{subj.fullName || "—"}</div>
                          <div className="small text-muted">{subj.program || "—"}</div>
                        </td>
                        <td>{subj.studentNumber ? `#${subj.studentNumber}` : "—"}</td>
                        <td>{vc.template_id || "—"}</td>
                        <td>{fmt(vc.createdAt)}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Badge bg={anchor === "anchored" ? "success" : "secondary"}>{anchor}</Badge>
                            {isClaimed ? (
                              <Badge bg="info">claimed</Badge>
                            ) : (
                              <Badge bg="warning" text="dark">claimable</Badge>
                            )}
                          </div>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={isClaimed ? "outline-secondary" : "outline-dark"}
                            disabled={isClaimed}
                            title={isClaimed ? "Already claimed" : "Show claim QR"}
                            onClick={() => !isClaimed && dispatch(openClaimQrForVC({ credId: vc._id }))}
                          >
                            <FaQrcode className="me-2" /> {isClaimed ? "QR disabled" : "QR"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No issued credentials found. Try adjusting filters.
                    </td>
                  </tr>
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
        claimed={claimed}
        setClaimed={setClaimed}
        onApply={() => { setShowSettings(false); apply(); }}
      />

      <ClaimQrModal />
    </section>
  );
}

// -------------------- Filter Modal --------------------
function FilterModal({ show, onClose, q, setQ, range, setRange, claimed, setClaimed, onApply }) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton><Modal.Title>Issued Filters</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form className="d-grid gap-3">
          <div>
            <Form.Label>Range</Form.Label>
            <Form.Select value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Form.Select>
          </div>
          <div>
            <Form.Label>Status</Form.Label>
            <Form.Select value={claimed} onChange={(e) => setClaimed(e.target.value)}>
              {CLAIMED_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </Form.Select>
            <Form.Text className="text-muted">
              Claimable = not yet claimed; Claimed = already redeemed.
            </Form.Text>
          </div>
          <div>
            <Form.Label>Search</Form.Label>
            <Form.Control
              placeholder="Name, student no., type…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={onApply}>Apply</Button>
      </Modal.Footer>
    </Modal>
  );
}

/** Static Claim QR modal (unchanged) */
function ClaimQrModal() {
  const dispatch = useDispatch();
  const { open, claim_id, claim_url, token, expires_at, reused, error } = useSelector(
    (s) => s.issuance.claimModal
  );

  const [size, setSize] = useState(320);
  const [qrSrc, setQrSrc] = useState("");
  const [isGen, setIsGen] = useState(false);
  const [qrErr, setQrErr] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => { if (open) setCopied(null); }, [open]);

  useEffect(() => {
    let cancelled = false;
    async function gen() {
      if (!open || !claim_url) { setQrSrc(""); return; }
      setIsGen(true); setQrErr(null);
      try {
        const url = await QRCode.toDataURL(claim_url, {
          width: size, margin: 2, errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        if (!cancelled) setQrSrc(url);
      } catch (e) {
        if (!cancelled) { setQrSrc(""); setQrErr(e?.message || "Failed to generate QR"); }
      } finally {
        if (!cancelled) setIsGen(false);
      }
    }
    gen();
    return () => { cancelled = true; };
  }, [open, claim_url, size]);

  const copy = async (text, which) => {
    try { await navigator.clipboard.writeText(text || ""); setCopied(which); setTimeout(() => setCopied(null), 1200); } catch {}
  };

  return (
    <Modal show={open} onHide={() => dispatch(closeClaimModal())} centered size="md">
      <Modal.Header closeButton><Modal.Title>Claim Token QR</Modal.Title></Modal.Header>
      <Modal.Body>
        {error ? (
          <div className="alert alert-danger mb-3">{String(error)}</div>
        ) : !(token && claim_id && claim_url) ? (
          <div className="text-center py-3"><Spinner animation="border" className="me-2" />Preparing ticket…</div>
        ) : (
          <>
            <div className="d-flex flex-column align-items-center">
              <div className="bg-white p-2 rounded" style={{ minHeight: size + 16 }}>
                {isGen ? (
                  <div className="text-center" style={{ width: size, height: size }}>
                    <Spinner animation="border" className="me-2" />
                  </div>
                ) : qrErr ? (
                  <div className="text-danger small" style={{ width: size, maxWidth: size }}>
                    {qrErr}
                  </div>
                ) : (
                  <img alt="Claim QR" width={size} height={size} src={qrSrc} style={{ imageRendering: "pixelated" }} />
                )}
              </div>

              <div className="mt-3 d-flex align-items-center gap-3">
                <Form.Label className="mb-0 small text-muted">Size</Form.Label>
                <Form.Range min={200} max={600} step={20} value={size} onChange={(e) => setSize(Number(e.target.value) || 320)} style={{ width: 220 }} />
                <a href={qrSrc || "#"} download={`claim-${token}.png`} className={`btn btn-sm btn-outline-secondary ${qrSrc ? "" : "disabled"}`} onClick={(e) => { if (!qrSrc) e.preventDefault(); }}>
                  <FaDownload className="me-2" /> Download PNG
                </a>
              </div>
            </div>

            <hr />

            <div className="d-flex justify-content-between align-items-start">
              <div className="me-3">
                <div className="small text-muted">Token</div>
                <code className="d-block" style={{ wordBreak: "break-all" }}>{token}</code>
                <Button size="sm" variant={copied === "token" ? "success" : "outline-secondary"} className="mt-2" onClick={() => copy(token, "token")}>
                  <FaRegCopy className="me-2" /> {copied === "token" ? "Copied" : "Copy token"}
                </Button>
              </div>

              <div className="text-end">
                <div className="small text-muted">Expires</div>
                <div>{fmt(expires_at)}</div>
                {reused ? <Badge bg="secondary" className="ms-1">reused</Badge> : null}
              </div>
            </div>

            <div className="mt-3">
              <div className="small text-muted">Public claim URL</div>
              <div className="d-flex align-items-center flex-wrap gap-2">
                <a href={claim_url} target="_blank" rel="noreferrer">
                  <FaExternalLinkAlt className="me-2" /> {claim_url}
                </a>
                <Button size="sm" variant={copied === "url" ? "success" : "outline-secondary"} onClick={() => copy(claim_url, "url")}>
                  <FaRegCopy className="me-2" /> {copied === "url" ? "Copied" : "Copy URL"}
                </Button>
              </div>
            </div>

            <div className="mt-2 small text-muted">
              Tip: Students can scan this QR even if they’re offline—the app can store the token and redeem the VC later when online.
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => dispatch(closeClaimModal())}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

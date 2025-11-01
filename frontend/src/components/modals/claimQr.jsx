import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Badge, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { closeClaimModal } from "../../features/issuance/issuanceSlice";
import { API_URL } from "../../../config";

export default function ClaimQrModal() {
  const dispatch = useDispatch();
  const { open, claim_id, claim_url, token, expires_at, reused, error } =
    useSelector((s) => s.issuance.claimModal);
  const authToken = useSelector((s) => s.auth?.user?.token);

  const [count, setCount] = useState(0);
  const [idx, setIdx] = useState(0);
  const [imgUrl, setImgUrl] = useState(null);

  const timer = useRef(null);
  const imgUrlRef = useRef(null);
  const iRef = useRef(0);

  const fps = 2; // frames per second
  const size = 320;

  // Fetch frame count when opened
  useEffect(() => {
    if (!open || !claim_id || !authToken) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/web/claims/${claim_id}/qr-embed/frames`, {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: "no-store",
        });
        const j = await r.json();
        if (!alive) return;
        const N = j.framesCount || (Array.isArray(j.frames) ? j.frames.length : 0);
        setCount(N);
        iRef.current = 0;
        setIdx(0);
      } catch (e) {
        console.error(e);
        setCount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, claim_id, authToken]);

  // Animate frames
  useEffect(() => {
    if (!open || !claim_id || !count || !authToken) return;
    clearInterval(timer.current);
    const period = Math.round(1000 / fps);

    timer.current = setInterval(async () => {
      try {
        const i = iRef.current % count;
        const r = await fetch(
          `${API_URL}/api/web/claims/${claim_id}/qr-embed/frame?i=${i}&size=${size}&_t=${Date.now()}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            cache: "no-store",
          }
        );
        if (!r.ok) throw new Error(`frame ${i}: ${r.status}`);
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        if (imgUrlRef.current) URL.revokeObjectURL(imgUrlRef.current);
        imgUrlRef.current = url;
        setImgUrl(url);
        iRef.current = (iRef.current + 1) % count;
        setIdx(iRef.current);
      } catch (e) {
        console.error(e);
      }
    }, period);

    return () => {
      clearInterval(timer.current);
      if (imgUrlRef.current) URL.revokeObjectURL(imgUrlRef.current);
    };
  }, [open, claim_id, count, authToken, fps, size]);

  const onHide = () => dispatch(closeClaimModal());

  return (
    <Modal show={open} onHide={onHide} centered size="md">
      <Modal.Header closeButton>
        <Modal.Title>Collect Credential (Offline QR)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger mb-3">{String(error)}</div>}

        {!claim_id ? (
          <div className="text-center py-4 text-muted">
            <Spinner animation="border" className="me-2" />
            Preparing ticket…
          </div>
        ) : (
          <>
            <div className="d-flex flex-column align-items-center">
              <div className="bg-white p-2 rounded">
                {count ? (
                  <img
                    alt="QR frame"
                    width={size}
                    height={size}
                    style={{ imageRendering: "pixelated" }}
                    src={imgUrl || ""}
                  />
                ) : (
                  <div
                    className="text-muted py-5 px-4"
                    style={{ width: size, height: size }}
                  >
                    <div className="text-center">
                      <Spinner animation="border" className="me-2" />
                      Generating frames…
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 small text-muted">
                Frame {count ? idx + 1 : "—"} / {count || "—"} · FPS {fps}
              </div>
            </div>

            <hr />

            <div className="d-flex justify-content-between">
              <div>
                <div className="small text-muted">Token</div>
                <code className="d-block" style={{ wordBreak: "break-all" }}>
                  {token || "—"}
                </code>
              </div>
              <div className="text-end">
                <div className="small text-muted">Expires</div>
                <div>
                  {expires_at
                    ? new Date(expires_at).toLocaleString()
                    : "—"}
                </div>
                {reused ? (
                  <Badge bg="secondary" className="ms-1">
                    reused
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <div className="small text-muted">Online fallback</div>
              <a href={claim_url} target="_blank" rel="noreferrer">
                {claim_url}
              </a>
            </div>

            <div className="mt-2">
              <div className="small text-muted">Standalone full-screen page</div>
              <a
                href={`${API_URL}/api/web/claims/${claim_id}/qr-embed/page?fps=${fps}&size=${size}`}
                target="_blank"
                rel="noreferrer"
              >
                Open animated QR page
              </a>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

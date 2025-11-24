// src/pages/Blockchain.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { Card, Badge } from "react-bootstrap";
import { FaSmile, FaSmileBeam, FaGrinStars } from "react-icons/fa";
import Chart from "react-apexcharts";

export default function Blockchain() {
  // ------- USER + per-day localStorage keys -------
  const { user } = useSelector((s) => s.auth);
  const userId = user?._id || "me";
  const dayKey = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const BC_FLAG = `BC_ONCE_${userId}_${dayKey}`;  // "1" when fetched today
  const BC_DATA = `BC_DATA_${userId}_${dayKey}`;  // stringified snapshot

  // ------- YOUR ADDRESS -------
  const ADDRESS = "0x0f3E7b79FEcb121cfA43e4915a2692Cf0E642235";

  // ------- DEFAULT: Polygon Amoy (testnet) -------
  const NETWORK = "polygonAmoy"; // "polygonAmoy" | "polygon" | "ethereum"

  const CONFIG = {
    ethereum: {
      label: "Ethereum Mainnet",
      apiBase: "https://api.etherscan.io/v2/api",
      chainId: 1,
      priceIdCandidates: ["ethereum"], // fiat OK on mainnet
      symbol: "ETH",
      apiKey: "BV7A337W5HU47QMPJ9817NMNJI6WR5HBNC",
      explorer: (a) => `https://etherscan.io/address/${a}`,
      explorerTx: (h) => `https://etherscan.io/tx/${h}`,
    },
    polygon: {
      label: "Polygon PoS (Mainnet)",
      apiBase: "https://api.etherscan.io/v2/api",
      chainId: 137,
      priceIdCandidates: ["polygon", "matic-network", "polygon-ecosystem-token"],
      symbol: "POL",
      apiKey: "BV7A337W5HU47QMPJ9817NMNJI6WR5HBNC",
      explorer: (a) => `https://polygonscan.com/address/${a}`,
      explorerTx: (h) => `https://polygonscan.com/tx/${h}`,
    },
    polygonAmoy: {
      label: "Polygon Amoy (Testnet)",
      apiBase: "https://api.etherscan.io/v2/api", // Etherscan V2 is multichain
      chainId: 80002,
      priceIdCandidates: [], // disable fiat on testnet
      symbol: "POL",
      apiKey: "BV7A337W5HU47QMPJ9817NMNJI6WR5HBNC",
      explorer: (a) => `https://amoy.polygonscan.com/address/${a}`,
      explorerTx: (h) => `https://amoy.polygonscan.com/tx/${h}`,
    },
  };

  const NET = CONFIG[NETWORK];

  // ------- State -------
  const [gasData, setGasData] = useState(null);
  const [tokenPricePhp, setTokenPricePhp] = useState(null); // nullable on testnet
  const [usedPriceId, setUsedPriceId] = useState(null);
  const [priceErr, setPriceErr] = useState(null);
  const [balance, setBalance] = useState(null);
  const [contractInfo, setContractInfo] = useState({ address: null, active: null, tx: null });
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [history, setHistory] = useState([]); // [{t, safe, propose, fast}]
  const mountedRef = useRef(false);

  // Respect API limit: NO polling by default
  const enablePolling = false;
  const refreshMs = 60_000;

  // ------- helpers -------
  const buildUrl = (module, action, extraParams = {}) => {
    const params = new URLSearchParams({
      chainid: String(NET.chainId),
      module,
      action,
      apikey: NET.apiKey,
      ...extraParams,
    });
    return `${NET.apiBase}?${params.toString()}`;
  };

  const short = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-");

  const tiersFromSingleGwei = (g) => {
    const n = Number(g);
    return {
      SafeGasPrice: String(Math.max(1, Math.round(n * 0.9))),
      ProposeGasPrice: String(Math.round(n)),
      FastGasPrice: String(Math.round(n * 1.2)),
    };
  };

  const fetchOracle = async () => {
    const d = (await axios.get(buildUrl("gastracker", "gasoracle")))?.data;
    if (d?.status === "1" && d.result) return d.result;
    throw new Error(d?.message || d?.result || "Oracle NOTOK");
  };

  const fetchProxyGasPrice = async () => {
    const d = (await axios.get(buildUrl("proxy", "eth_gasPrice")))?.data;
    const hexWei = d?.result;
    if (typeof hexWei !== "string" || !hexWei.startsWith("0x")) {
      throw new Error(`Unexpected proxy response ${JSON.stringify(d || {})}`);
    }
    const gwei = parseInt(hexWei, 16) / 1e9;
    if (!Number.isFinite(gwei)) throw new Error("Failed to parse gas price from proxy.");
    return tiersFromSingleGwei(gwei);
  };

  // --- price (optional; skip on testnet) ---
  const fetchPricePhp = async () => {
    if (!NET.priceIdCandidates.length) return null; // testnet: no fiat
    for (const id of NET.priceIdCandidates) {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=php`;
        const r = await axios.get(url, { timeout: 10000 });
        const php = r?.data?.[id]?.php;
        if (typeof php === "number") return { php, idUsed: id };
      } catch (_) {}
    }
    return null;
  };

  const weiToFloat = (weiStr, decimals = 18) => {
    const wei = BigInt(weiStr);
    const base = BigInt(10) ** BigInt(decimals);
    const whole = wei / base;
    const frac = wei % base;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
    return parseFloat(`${whole.toString()}.${fracStr}`);
  };

  const fetchBalance = async () => {
    const d = (
      await axios.get(buildUrl("account", "balance", { address: ADDRESS, tag: "latest" }))
    )?.data;
    if (d?.status === "1") return weiToFloat(d.result, 18);
    throw new Error(d?.message || "Balance error");
  };

  // ---- contract creation (receipt + code) ----
  const getReceiptContract = async (txhash) => {
    const r = (
      await axios.get(buildUrl("proxy", "eth_getTransactionReceipt", { txhash }))
    )?.data?.result;
    return r?.contractAddress && r.contractAddress !== "0x" ? r.contractAddress : null;
  };

  const hasCode = async (addr) => {
    const code = (
      await axios.get(buildUrl("proxy", "eth_getCode", { address: addr, tag: "latest" }))
    )?.data?.result;
    return !!code && code !== "0x";
  };

  // Scan recent outbound txs; find first receipt with contractAddress
  const fetchLatestCreatedContractBy = async () => {
    const d = (
      await axios.get(
        buildUrl("account", "txlist", {
          address: ADDRESS,
          sort: "desc",
          page: 1,
          offset: 50,
        })
      )
    )?.data;

    if (d?.status !== "1" || !Array.isArray(d.result)) {
      return { address: null, active: null, tx: null };
    }

    const sent = d.result.filter(
      (tx) => (tx.from || "").toLowerCase() === ADDRESS.toLowerCase()
    );

    for (const tx of sent) {
      const caddr = await getReceiptContract(tx.hash);
      if (caddr) {
        const active = await hasCode(caddr);
        return { address: caddr, active, tx: tx.hash };
      }
    }
    return { address: null, active: null, tx: null };
  };

  // Extra fallback: verify a known contract (optional)
  const confirmKnownContract = async (contractAddress) => {
    const d = (
      await axios.get(
        buildUrl("contract", "getcontractcreation", { contractaddresses: contractAddress })
      )
    )?.data;
    if (d?.status === "1" && Array.isArray(d.result) && d.result[0]) {
      return {
        address: contractAddress,
        active: await hasCode(contractAddress),
        tx: d.result[0].txHash || null,
      };
    }
    return null;
  };

  // ------- snapshot save/load using localStorage -------
  const saveSnapshot = (snap) => {
    try {
      localStorage.setItem(BC_DATA, JSON.stringify(snap));
      localStorage.setItem(BC_FLAG, "1");
    } catch {}
  };

  const loadSnapshot = () => {
    try {
      const raw = localStorage.getItem(BC_DATA);
      if (!raw) return null;
      const snap = JSON.parse(raw);
      return snap && typeof snap === "object" ? snap : null;
    } catch {
      return null;
    }
  };

  const clearSnapshot = () => {
    try {
      localStorage.removeItem(BC_DATA);
      localStorage.removeItem(BC_FLAG);
    } catch {}
  };

  // ------- one-shot fetch (and then cache) -------
    const fetchOnce = async () => {
    try {
      setErrMsg("");
      setPriceErr(null);

      const gasPromise = (async () => {
        try {
          return await fetchOracle();
        } catch (e1) {
          try {
            return await fetchProxyGasPrice();
          } catch (e2) {
            throw new Error(`${e1.message} | ${e2.message}`);
          }
        }
      })();

      const [gasRes, priceRes, balRes, createdRes] = await Promise.all([
        gasPromise,
        fetchPricePhp(),
        fetchBalance().catch(() => null),
        fetchLatestCreatedContractBy().catch(() => ({
          address: null,
          active: null,
          tx: null,
        })),
      ]);

      let finalCreated = createdRes;
      if (!createdRes.address) {
        const hinted = await confirmKnownContract(
          "0x0ac96734b9a2a368D8EE3f6CF9BC27EC373f195f"
        ).catch(() => null);
        if (hinted) finalCreated = hinted;
      }

      // --- base state updates ---
      setGasData(gasRes);
      if (priceRes) {
        setTokenPricePhp(priceRes.php);
        setUsedPriceId(priceRes.idUsed);
      } else {
        setTokenPricePhp(null);
        setUsedPriceId(null);
        setPriceErr(
          NET.priceIdCandidates.length
            ? "Price service unavailable"
            : "Testnet (no fiat)"
        );
      }
      if (balRes !== null) setBalance(balRes);
      setContractInfo(finalCreated);

      // --- history point + snapshot (✅ this is the important part) ---
      const safe = parseFloat(gasRes.SafeGasPrice);
      const propose = parseFloat(gasRes.ProposeGasPrice);
      const fast = parseFloat(gasRes.FastGasPrice);
      const now = Date.now();

      setHistory((prev) => {
        const base = Array.isArray(prev) ? prev : [];

        let updated = base;
        if ([safe, propose, fast].every(Number.isFinite)) {
          updated = [...base, { t: now, safe, propose, fast }];
          updated = updated.slice(-120); // keep last 120 points
        }

        // Save snapshot with the full updated history
        saveSnapshot({
          ts: Date.now(),
          gasData: gasRes,
          tokenPricePhp: priceRes?.php ?? null,
          usedPriceId: priceRes?.idUsed ?? null,
          balance: balRes ?? null,
          contractInfo: finalCreated,
          history: updated,
        });

        return updated;
      });
    } catch (err) {
      setErrMsg(err?.message || "Failed to load data.");
    }
  };

  // --- On mount: hydrate from localStorage (per user/day) or fetch once ---
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      setLoading(true);

      const snap = loadSnapshot();
      if (snap) {
        // hydrate without network
        setGasData(snap.gasData || null);
        setTokenPricePhp(snap.tokenPricePhp ?? null);
        setUsedPriceId(snap.usedPriceId ?? null);
        setBalance(snap.balance ?? null);
        setContractInfo(snap.contractInfo ?? { address: null, active: null, tx: null });
        setHistory(Array.isArray(snap.history) ? snap.history : []);
        setLoading(false);
      } else {
        await fetchOnce();
        if (mountedRef.current) setLoading(false);
      }
    })();

    // optional polling (disabled by default)
    const id = enablePolling ? setInterval(() => mountedRef.current && fetchOnce(), refreshMs) : null;
    return () => {
      mountedRef.current = false;
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NETWORK, ADDRESS, userId, dayKey]);

  // Manual refresh (clear cache and re-scan)
  const handleRefresh = async () => {
    setLoading(true);
    clearSnapshot();
    await fetchOnce();
    setLoading(false);
  };

  // ------- memos -------
  const chartSeries = useMemo(
    () => [
      { name: "Safe", data: history.map((p) => ({ x: p.t, y: p.safe })) },
      { name: "Average", data: history.map((p) => ({ x: p.t, y: p.propose })) },
      { name: "Fast", data: history.map((p) => ({ x: p.t, y: p.fast })) },
    ],
    [history]
  );


  const chartOptions = useMemo(
    () => ({
      chart: { id: "gas-line", animations: { easing: "easeinout", dynamicAnimation: { speed: 400 } }, toolbar: { show: false } },
      stroke: { curve: "smooth", width: 3 },
      xaxis: { type: "datetime", labels: { datetimeUTC: false } },
      yaxis: { title: { text: "Gwei" }, labels: { formatter: (v) => (Number.isFinite(v) ? v.toFixed(0) : v) } },
      tooltip: { x: { format: "HH:mm" }, y: { formatter: (v) => `${v?.toFixed?.(3) ?? v} Gwei` } },
      legend: { position: "top" },
      noData: { text: "Collecting gas data..." },
    }),
    []
  );

  // ------- early returns -------
  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (!gasData) {
    return (
      <div className="alert alert-danger mt-3">
        <strong>Error loading data:</strong> {errMsg || "Unknown error."}
      </div>
    );
  }

  // ------- UI calcs -------
  const gweiToNative = (gwei, gasLimit = 21000) => {
    const g = parseFloat(gwei);
    if (!Number.isFinite(g)) return null;
    return (g * gasLimit) / 1e9; // in POL/MATIC
  };
  const gweiToPhp = (gwei, gasLimit = 21000) => {
    if (tokenPricePhp == null) return null;
    const coin = gweiToNative(gwei, gasLimit);
    if (!Number.isFinite(coin)) return null;
    return (coin * tokenPricePhp).toFixed(4);
  };

  const baseFee = gasData.suggestBaseFee ? parseFloat(gasData.suggestBaseFee) : null;
  const priority = (tier) =>
    baseFee !== null ? Math.max(0, parseFloat(tier) - baseFee).toFixed(3) : null;

  const safeFeeNative = gweiToNative(gasData.SafeGasPrice);
  const fastFeeNative = gweiToNative(gasData.ProposeGasPrice);
  const rapidFeeNative = gweiToNative(gasData.FastGasPrice);

  const safeFeePhp = gweiToPhp(gasData.SafeGasPrice);
  const fastFeePhp = gweiToPhp(gasData.ProposeGasPrice);
  const rapidFeePhp = gweiToPhp(gasData.FastGasPrice);

  const fiat = (val) => `₱${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <section className="header">
      <div className="container mt-4">
        {/* Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between p-3 rounded bg-light border">
          <div className="d-flex align-items-center gap-3">
            <Badge bg="dark">{NET.label}</Badge>
            <Badge bg="secondary">Etherscan V2 (chainid: {NET.chainId})</Badge>
          </div>
          <div className="text-end">
            <div className="fw-semibold text-muted" style={{ fontSize: 13 }}>
              Current Gas (Avg)
            </div>
            <div className="fw-bold" style={{ fontSize: 32, lineHeight: 1 }}>
              {parseFloat(gasData.ProposeGasPrice).toFixed(3)} <span className="text-muted">Gwei</span>
            </div>
            {gasData.LastBlock && (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Last Block: {gasData.LastBlock}
              </div>
            )}
          </div>
        </div>

        {/* Price strip */}
        <div className="alert alert-info mt-3 d-flex flex-column flex-md-row gap-3 justify-content-between align-items-center">
          <div>
            <strong>{NET.symbol} Price (PHP):</strong>{" "}
            {tokenPricePhp != null ? fiat(tokenPricePhp) : <span className="text-muted">testnet / unavailable</span>}
            {usedPriceId && tokenPricePhp != null && (
              <span className="text-muted ms-2 small">via CG id: {usedPriceId}</span>
            )}
            {priceErr && <span className="text-muted ms-2 small">({priceErr})</span>}
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">Refresh: {enablePolling ? `${Math.round(refreshMs / 1000)}s` : "off"}</span>
            <button className="btn btn-sm btn-outline-primary" onClick={handleRefresh}>
              Refresh now
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="row">
          <div className="col-md-4 mb-3">
            <Card className="text-center shadow-sm h-100">
              <Card.Body>
                <FaSmile size={28} className="mb-2 text-primary" />
                <div className="fw-semibold">Standard</div>
                <div className="display-6">{parseFloat(gasData.SafeGasPrice).toFixed(3)} Gwei</div>
                {baseFee !== null && (
                  <div className="small text-muted">
                    Base: {baseFee.toFixed(3)} • Priority: {priority(gasData.SafeGasPrice)} Gwei
                  </div>
                )}
                <div className="mt-2">
                  ≈ {safeFeeNative?.toFixed?.(6)} {NET.symbol}
                  {safeFeePhp && <> • {fiat(safeFeePhp)}</>}
                </div>
              </Card.Body>
            </Card>
          </div>

          <div className="col-md-4 mb-3">
            <Card className="text-center shadow-sm h-100">
              <Card.Body>
                <FaSmileBeam size={28} className="mb-2 text-success" />
                <div className="fw-semibold">Fast</div>
                <div className="display-6">{parseFloat(gasData.ProposeGasPrice).toFixed(3)} Gwei</div>
                {baseFee !== null && (
                  <div className="small text-muted">
                    Base: {baseFee.toFixed(3)} • Priority: {priority(gasData.ProposeGasPrice)} Gwei
                  </div>
                )}
                <div className="mt-2">
                  ≈ {fastFeeNative?.toFixed?.(6)} {NET.symbol}
                  {fastFeePhp && <> • {fiat(fastFeePhp)}</>}
                </div>
              </Card.Body>
            </Card>
          </div>

          <div className="col-md-4 mb-3">
            <Card className="text-center shadow-sm h-100">
              <Card.Body>
                <FaGrinStars size={28} className="mb-2 text-warning" />
                <div className="fw-semibold">Rapid</div>
                <div className="display-6">{parseFloat(gasData.FastGasPrice).toFixed(3)} Gwei</div>
                {baseFee !== null && (
                  <div className="small text-muted">
                    Base: {baseFee.toFixed(3)} • Priority: {priority(gasData.FastGasPrice)} Gwei
                  </div>
                )}
                <div className="mt-2">
                  ≈ {rapidFeeNative?.toFixed?.(6)} {NET.symbol}
                  {rapidFeePhp && <> • {fiat(rapidFeePhp)}</>}
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Wallet + Chart */}
        <div className="row mt-2">
          {/* Wallet Overview */}
          <div className="col-lg-4 mb-3">
            <Card className="shadow-sm h-100">
              <Card.Body>
                <div className="fw-semibold mb-2">Wallet Overview</div>

                <div className="small text-muted">Address</div>
                <div className="mb-2">
                  <a href={NET.explorer(ADDRESS)} target="_blank" rel="noreferrer">
                    {short(ADDRESS)}
                  </a>
                </div>

                <div className="small text-muted">Balance</div>
                <div className="mb-2">
                  {balance !== null ? (
                    <>
                      <span className="fw-semibold">
                        {balance.toFixed(6)} {NET.symbol}
                      </span>
                      {tokenPricePhp != null && (
                        <div className="text-muted">≈ ₱{(balance * tokenPricePhp).toFixed(2)}</div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>

                <div className="small text-muted">Latest Contract Deployed</div>
                {contractInfo.address ? (
                  <div className="mt-1">
                    <a href={NET.explorer(contractInfo.address)} target="_blank" rel="noreferrer">
                      {short(contractInfo.address)}
                    </a>
                    <Badge bg={contractInfo.active ? "success" : "secondary"} className="ms-2">
                      {contractInfo.active ? "Active" : "Unknown"}
                    </Badge>
                    {contractInfo.tx && (
                      <div className="small mt-1">
                        Tx:{" "}
                        <a href={NET.explorerTx(contractInfo.tx)} target="_blank" rel="noreferrer">
                          {short(contractInfo.tx)}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-muted">No contract creation found</div>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Chart */}
          <div className="col-lg-8 mb-3">
            <Card className="shadow-sm h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-semibold">Historical Gas Prices</div>
                  <div className="text-muted small">Source: etherscan.io (multichain)</div>
                </div>
                <Chart type="line" height={320} series={chartSeries} options={chartOptions} />
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

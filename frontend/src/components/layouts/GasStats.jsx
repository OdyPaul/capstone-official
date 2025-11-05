import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Card, Badge } from "react-bootstrap";
import { FaSmile, FaSmileBeam, FaGrinStars } from "react-icons/fa";
import Spinner from "./Spinner";
import Chart from "react-apexcharts";

function GasStats() {
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
      chainId: 80002, // Amoy testnet
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
  const refreshMs = 60_000;
  const mountedRef = useRef(false);

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

  // Extra fallback: if you already know the contract address, this confirms creator/tx in one call
  // (Uses Etherscan V2: module=contract&action=getcontractcreation)
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
        fetchLatestCreatedContractBy().catch(() => ({ address: null, active: null, tx: null })),
      ]);

      // If nothing found, try the contract you mentioned explicitly (optional helper)
      let finalCreated = createdRes;
      if (!createdRes.address) {
        const hinted = await confirmKnownContract(
          "0x0ac96734b9a2a368D8EE3f6CF9BC27EC373f195f"
        ).catch(() => null);
        if (hinted) finalCreated = hinted;
      }

      setGasData(gasRes);
      if (priceRes) {
        setTokenPricePhp(priceRes.php);
        setUsedPriceId(priceRes.idUsed);
      } else {
        setTokenPricePhp(null);
        setUsedPriceId(null);
        setPriceErr(NET.priceIdCandidates.length ? "Price service unavailable" : "Testnet (no fiat)");
      }
      if (balRes !== null) setBalance(balRes);
      setContractInfo(finalCreated);

      // chart history
      const safe = parseFloat(gasRes.SafeGasPrice);
      const propose = parseFloat(gasRes.ProposeGasPrice);
      const fast = parseFloat(gasRes.FastGasPrice);
      const now = Date.now();
      if ([safe, propose, fast].every(Number.isFinite)) {
        setHistory((prev) => {
          if (prev.length && now - prev[prev.length - 1].t < 900) return prev;
          const next = [...prev, { t: now, safe, propose, fast }];
          return next.slice(-120);
        });
      }
    } catch (err) {
      setErrMsg(err?.message || "Failed to load data.");
    }
  };

  // ------- effects -------
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      setLoading(true);
      await fetchOnce();
      if (mountedRef.current) setLoading(false);
    })();
    const id = setInterval(() => mountedRef.current && fetchOnce(), refreshMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NETWORK, ADDRESS]);

  // ------- memos -------
  const chartSeries = useMemo(
    () => [
      { name: "Safe", data: history.map((p) => [p.t, p.safe]) },
      { name: "Average", data: history.map((p) => [p.t, p.propose]) },
      { name: "Fast", data: history.map((p) => [p.t, p.fast]) },
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
  if (loading) return <Spinner />;
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
      <div className="alert alert-info mt-3 d-flex flex-column flex-md-row gap-3 justify-content-between">
        <div>
          <strong>{NET.symbol} Price (PHP):</strong>{" "}
          {tokenPricePhp != null ? fiat(tokenPricePhp) : <span className="text-muted">testnet / unavailable</span>}
          {usedPriceId && tokenPricePhp != null && (
            <span className="text-muted ms-2 small">via CG id: {usedPriceId}</span>
          )}
          {priceErr && <span className="text-muted ms-2 small">({priceErr})</span>}
        </div>
        <div className="text-muted">Refresh: {Math.round(refreshMs / 1000)}s</div>
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

      {/* Wallet box + Chart on the same row */}
      <div className="row mt-2">
        {/* Wallet Overview (LEFT) */}
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

        {/* Chart (RIGHT) */}
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
  );
}

export default GasStats;

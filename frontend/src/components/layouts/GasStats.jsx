// GasStats.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "react-bootstrap";
import { FaSmile, FaSmileBeam, FaGrinStars } from "react-icons/fa";
import Spinner from "./Spinner";

function GasStats() {
  const [gasData, setGasData] = useState(null);
  const [maticPrice, setMaticPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_KEY = "YourApiKeyToken"; // replace with your Etherscan API key

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch gas data from Etherscan
        const gasRes = await axios.get(
          `https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle&apikey=${API_KEY}`
        );

        // Fetch MATIC price in PHP from CoinGecko
        const priceRes = await axios.get(
          "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=php"
        );

        setGasData(gasRes.data.result);
        setMaticPrice(priceRes.data["matic-network"].php);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <Spinner />;
  if (!gasData || !maticPrice) return <p>Error loading data</p>;

  // Helper: Convert Gwei → MATIC → PHP
  const gweiToPhp = (gwei, gasLimit = 21000) => {
    const ethValue = (gwei * gasLimit) / 1e9; // Gwei → ETH
    const maticValue = ethValue; // assume 1 ETH = 1 MATIC for gas calculation
    const phpValue = maticValue * maticPrice;
    return isNaN(phpValue) ? null : phpValue.toFixed(4);
  };

  const safeFee = gweiToPhp(gasData.SafeGasPrice);
  const fastFee = gweiToPhp(gasData.ProposeGasPrice);
  const rapidFee = gweiToPhp(gasData.FastGasPrice);

  return (
    <div className="container mt-4">
      {/* MATIC Price on top */}
      <div className="alert alert-info mt-3">
        <strong>MATIC Price:</strong> ₱{maticPrice.toFixed(2)}
      </div>

      {/* Gas Fee Stats */}
      {(!safeFee || !fastFee || !rapidFee) ? (
        <div className="alert alert-warning text-center">
          Gas fees stats is loading..
        </div>
      ) : (
        <div className="row">
          {/* Standard */}
          <div className="col-md-4 mb-3">
            <Card className="text-center shadow-sm">
              <Card.Body>
                <FaSmile size={32} className="mb-2 text-primary" />
                <Card.Title>Standard</Card.Title>
                <h3>{gasData.SafeGasPrice} Gwei</h3>
                <p>~ {gasData.SafeGasEstimate} secs</p>
                <p>≈ ₱{safeFee}</p>
              </Card.Body>
            </Card>
          </div>

          {/* Fast */}
          <div className="col-md-4 mb-3">
            <Card className="text-center shadow-sm">
              <Card.Body>
                <FaSmileBeam size={32} className="mb-2 text-success" />
                <Card.Title>Fast</Card.Title>
                <h3>{gasData.ProposeGasPrice} Gwei</h3>
                <p>~ {gasData.FastGasEstimate} secs</p>
                <p>≈ ₱{fastFee}</p>
              </Card.Body>
            </Card>
          </div>

          {/* Rapid */}
          <div className="col-md-4 mb-3">
            <Card className="text-center shadow-sm">
              <Card.Body>
                <FaGrinStars size={32} className="mb-2 text-warning" />
                <Card.Title>Rapid</Card.Title>
                <h3>{gasData.FastGasPrice} Gwei</h3>
                <p>~ {gasData.RapidGasEstimate} secs</p>
                <p>≈ ₱{rapidFee}</p>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default GasStats;

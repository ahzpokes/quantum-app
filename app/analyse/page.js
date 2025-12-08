'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../utils/supabaseClient';
import StockDetailsModal from '../../components/StockDetailsModal';

const AnalysisCard = ({ stock, onClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMissingData = async () => {
      // Initial data from Supabase
      let baseData = {
        profile: {
          currency: 'USD',
          logo: stock.logo,
        },
        metrics: {
          peTTM: stock.pe_ratio,
          marketCapitalization: stock.market_cap ? stock.market_cap / 1000000 : 0,
          dividendYieldIndicatedAnnual: stock.dividend_yield,
        },
        earnings: [],
        recommendation: { buy: 0, hold: 0, sell: 0, strongBuy: 0, strongSell: 0 },
        peForward: stock.pe_forward,
        pegRatio: stock.peg_ratio,
      };

      // Always fetch live details because Supabase doesn't store Earnings or Recommendations
      if (true) {
        // Force fetch for now to get Earnings
        try {
          const res = await fetch(`/api/quote?symbol=${stock.symbol}`);
          const apiData = await res.json();

          if (!apiData.error) {
            baseData.earnings = apiData.earnings || [];
            baseData.recommendation = apiData.recommendations || baseData.recommendation;
            if (!baseData.pegRatio) baseData.pegRatio = apiData.pegRatio;
            if (!baseData.peForward) baseData.peForward = apiData.peForward;
            if (!baseData.metrics.peTTM) baseData.metrics.peTTM = apiData.peTrailing;
          }
        } catch (e) {
          console.error('Error fetching live details', e);
        }
      }

      setData(baseData);
      setLoading(false);
    };

    loadMissingData();
  }, [stock]);

  if (loading)
    return (
      <div
        className="summary-card"
        style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className="fas fa-spinner fa-spin" style={{ color: 'var(--gray)' }}></i>
      </div>
    );

  if (!data) return null;

  const recTotal =
    (data.recommendation.buy || 0) +
    (data.recommendation.hold || 0) +
    (data.recommendation.sell || 0) +
    (data.recommendation.strongBuy || 0) +
    (data.recommendation.strongSell || 0);
  const buyScore = (data.recommendation.buy || 0) + (data.recommendation.strongBuy || 0);

  // --- Advanced Logic (Growth Screener Integration) ---
  const peTrailing = data.metrics.peTTM;
  const peForward = data.peForward;
  const pegRatio = data.pegRatio;

  // 1. PE Expansion Criteria (> 20% difference)
  const peDiff = peTrailing && peForward ? (peTrailing - peForward) / peTrailing : 0;
  const isPeExpansionOk = peDiff >= 0.2;

  // 2. PEG Criteria (<= 1.0)
  const isPegOk = pegRatio && pegRatio <= 1.0;

  // 3. Consistency Criteria (>= 3/4 Beats)
  const earningsConsistency = Array.isArray(data.earnings)
    ? data.earnings.filter((e) => e.actual >= e.estimate).length
    : 0;
  const isConsistencyOk = earningsConsistency >= 3;

  // Calculate Score & Recommendation
  let score = 0;
  if (isPeExpansionOk) score++;
  if (isPegOk) score++;
  if (isConsistencyOk) score++;

  let recommendation = 'REJECT';
  let recColor = 'var(--danger)';
  let recIcon = 'fa-times-circle';

  if (score === 3) {
    recommendation = 'BUY';
    recColor = 'var(--success)';
    recIcon = 'fa-check-circle';
  } else if (score === 2) {
    recommendation = 'WATCH';
    recColor = '#ffc107'; // Warning/Yellow
    recIcon = 'fa-exclamation-circle';
  } else if (score === 1) {
    recommendation = 'PASS';
    recColor = '#ff9800'; // Orange
    recIcon = 'fa-minus-circle';
  }

  return (
    <div
      className="summary-card"
      onClick={() => onClick(stock)}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Recommendation Banner */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: recColor,
          color: '#fff',
          padding: '4px 12px',
          borderBottomLeftRadius: '8px',
          fontSize: '10px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <i className={`fas ${recIcon}`}></i> {recommendation}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          marginTop: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {stock.logo ? (
            <img
              src={stock.logo}
              alt={stock.symbol}
              width={32}
              height={32}
              style={{ borderRadius: '6px', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#1a237e',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '10px',
              }}
            >
              {stock.symbol.substring(0, 2)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{stock.symbol}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{stock.name}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '12px',
          marginBottom: '15px',
        }}
      >
        <div>
          <div style={{ color: 'var(--gray)' }}>Cap. Boursière</div>
          <div style={{ fontWeight: 600 }}>
            {data.metrics.marketCapitalization
              ? `${(data.metrics.marketCapitalization / 1000).toFixed(1)} B$`
              : '-'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--gray)' }}>Dividende</div>
          <div style={{ fontWeight: 600, color: 'var(--success)' }}>
            {data.metrics.dividendYieldIndicatedAnnual
              ? `${data.metrics.dividendYieldIndicatedAnnual.toFixed(2)}%`
              : '-'}
          </div>
        </div>
      </div>

      {/* Advanced Analysis Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '12px',
          marginBottom: '15px',
          background: 'var(--table-hover)',
          padding: '10px',
          borderRadius: '8px',
        }}
      >
        {/* PE Comparison */}
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ color: 'var(--gray)' }}>PE (Trail vs Fwd)</div>
            <div style={{ fontWeight: 600 }}>
              {peTrailing ? peTrailing.toFixed(1) : '-'} / {peForward ? peForward.toFixed(1) : '-'}
            </div>
          </div>
          {isPeExpansionOk && (
            <span className="badge badge-success" style={{ fontSize: '10px' }}>
              Exp. {Math.round(peDiff * 100)}%
            </span>
          )}
        </div>

        {/* PEG Ratio */}
        <div>
          <div style={{ color: 'var(--gray)' }}>PEG Ratio</div>
          <div style={{ fontWeight: 600, color: isPegOk ? 'var(--success)' : 'inherit' }}>
            {pegRatio ? pegRatio.toFixed(2) : '-'}
          </div>
        </div>

        {/* Earnings Consistency */}
        <div>
          <div style={{ color: 'var(--gray)' }}>Earnings (4Q)</div>
          <div
            style={{
              fontWeight: 600,
              color: isConsistencyOk ? 'var(--success)' : 'var(--warning)',
            }}
          >
            {earningsConsistency}/4 Beats
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--gray)', marginBottom: '5px' }}>
          Avis Analystes ({recTotal})
        </div>
        <div
          style={{
            display: 'flex',
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
            background: 'var(--border-color)',
          }}
        >
          <div
            style={{
              width: `${recTotal ? (buyScore / recTotal) * 100 : 0}%`,
              background: 'var(--success)',
            }}
          ></div>
          <div
            style={{
              width: `${recTotal ? (data.recommendation.hold / recTotal) * 100 : 0}%`,
              background: '#ffc107',
            }}
          ></div>
          <div
            style={{
              width: `${recTotal ? ((data.recommendation.sell + data.recommendation.strongSell) / recTotal) * 100 : 0}%`,
              background: 'var(--danger)',
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default function Analyse() {
  const [portfolio, setPortfolio] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    // Fetch all columns to get cached data
    const { data } = await supabase.from('positions').select('*');
    if (data) setPortfolio(data);
  };

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="section-title">Analyse du Portefeuille</div>
        <p style={{ marginBottom: '20px', color: 'var(--gray)' }}>
          Screener Growth : Analyse automatique basée sur PE Expansion, PEG et Earnings Consistency.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {portfolio.map((stock) => (
            <AnalysisCard key={stock.symbol} stock={stock} onClick={setSelectedStock} />
          ))}
        </div>
      </main>

      <StockDetailsModal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        stock={selectedStock}
      />
    </div>
  );
}

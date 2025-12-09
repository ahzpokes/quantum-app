'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import StockDetailsModal from '../../components/StockDetailsModal';
import { supabase } from '../../utils/supabaseClient';

const WatchlistCard = ({ symbol, onRemove, onClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Data from our new Yahoo Finance API
        const res = await fetch(`/api/quote?symbol=${symbol}`);
        const yahooData = await res.json();

        if (yahooData.error) throw new Error(yahooData.error);

        // Optional: Fetch Logo from Finnhub if needed (Yahoo doesn't always provide it)
        let logo = null;
        try {
          const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
          const profileRes = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
          );
          const profile = await profileRes.json();
          logo = profile.logo;
        } catch (e) {
          console.error('Logo fetch error', e);
        }

        setData({
          profile: {
            name: yahooData.name,
            ticker: yahooData.symbol,
            currency: yahooData.currency,
            logo: logo,
            description: yahooData.description,
          },
          metrics: {
            '52WeekHigh': yahooData.high52w,
            '52WeekLow': yahooData.low52w,
            peTTM: yahooData.peTrailing,
            peNtm: yahooData.peForward,
            pegRatio: yahooData.pegRatio,
            marketCapitalization: yahooData.marketCap ? yahooData.marketCap / 1000000 : 0, // Convert to Millions
            dividendYieldIndicatedAnnual: yahooData.dividendYield,
            beta: yahooData.beta,
            currentPrice: yahooData.currentPrice,
          },
          earnings: yahooData.earnings,
          recommendation: yahooData.recommendations,
          peForward: yahooData.peForward,
          pegRatio: yahooData.pegRatio,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

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

  // --- Advanced Logic (Growth Screener Integration) ---
  const peTrailing = data.metrics.peTTM;
  const peForward = data.metrics.peNtm || data.metrics.peForward;
  const pegRatio = data.metrics.pegRatioTTM || data.metrics.pegRatio;

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

  const recTotal =
    (data.recommendation.buy || 0) +
    (data.recommendation.hold || 0) +
    (data.recommendation.sell || 0) +
    (data.recommendation.strongBuy || 0) +
    (data.recommendation.strongSell || 0);
  const buyScore = (data.recommendation.buy || 0) + (data.recommendation.strongBuy || 0);

  // Prepare object for Modal
  const stockForModal = {
    symbol: data.profile.ticker,
    name: data.profile.name,
    logo: data.profile.logo,
    current_price: data.metrics.currentPrice,
    beta: data.metrics.beta,
    high_52w: data.metrics['52WeekHigh'],
    low_52w: data.metrics['52WeekLow'],
    pe_ratio: peTrailing,
    pe_forward: peForward,
    peg_ratio: pegRatio,
    dividend_yield: data.metrics.dividendYieldIndicatedAnnual,
    description: data.profile.description,
  };

  return (
    <div
      className="summary-card"
      style={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        overflow: 'hidden',
      }}
      onClick={() => onClick(stockForModal)}
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
          zIndex: 5,
        }}
      >
        <i className={`fas ${recIcon}`}></i> {recommendation}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(symbol);
        }}
        style={{
          position: 'absolute',
          top: '30px',
          right: '5px',
          border: 'none',
          background: 'none',
          color: 'var(--gray)',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <i className="fas fa-times"></i>
      </button>

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
          {data.profile.logo ? (
            <Image
              src={data.profile.logo}
              alt={data.profile.name || symbol || 'logo'}
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
                fontSize: '10px',
                fontWeight: 'bold',
              }}
            >
              {symbol.substring(0, 2)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{data.profile.ticker}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{data.profile.name}</div>
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

// Risk Parity Card Component - Uses data from Python script stored in Supabase
const RiskParityCard = ({ symbol, onRemove, supabaseData }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First check if we have data from Supabase (from Python script)
        if (supabaseData && supabaseData.momentum_ratio) {
          // Get logo from Finnhub
          let logo = null;
          try {
            const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
            const profileRes = await fetch(
              `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
            );
            const profile = await profileRes.json();
            logo = profile.logo;
          } catch (e) {
            console.error('Logo fetch error', e);
          }

          // Get current price from Yahoo
          const res = await fetch(`/api/quote?symbol=${symbol}`);
          const yahooData = await res.json();

          setData({
            symbol: symbol,
            name: yahooData.name || symbol,
            logo: logo,
            currentPrice: yahooData.currentPrice || 0,
            beta: supabaseData.beta || yahooData.beta || 1,
            volatility: supabaseData.volatility || 0,
            momentum: supabaseData.momentum_ratio || 1,
            high52w: yahooData.high52w || 0,
            low52w: yahooData.low52w || 0,
            peRatio: supabaseData.pe_ratio || 0,
            growthEst: supabaseData.growth_est || 0,
            updatedAt: supabaseData.updated_at,
            fromScript: true,
          });
        } else {
          // Fallback to Yahoo API if no Supabase data
          const res = await fetch(`/api/quote?symbol=${symbol}`);
          const yahooData = await res.json();

          if (yahooData.error) throw new Error(yahooData.error);

          let logo = null;
          try {
            const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
            const profileRes = await fetch(
              `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
            );
            const profile = await profileRes.json();
            logo = profile.logo;
          } catch (e) {
            console.error('Logo fetch error', e);
          }

          const high52 = yahooData.high52w || 0;
          const low52 = yahooData.low52w || 0;
          const currentPrice = yahooData.currentPrice || 0;
          const volatilityApprox =
            high52 && low52 ? ((high52 - low52) / ((high52 + low52) / 2)) * 100 : 0;
          const avg52w = (high52 + low52) / 2;
          const momentumRatio = avg52w > 0 ? currentPrice / avg52w : 1;

          setData({
            symbol: yahooData.symbol,
            name: yahooData.name,
            logo: logo,
            currentPrice: currentPrice,
            beta: yahooData.beta || 1,
            volatility: volatilityApprox,
            momentum: momentumRatio,
            high52w: high52,
            low52w: low52,
            peRatio: yahooData.peForward || 0,
            growthEst: 0,
            fromScript: false,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

  if (loading)
    return (
      <div
        className="summary-card"
        style={{
          minHeight: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className="fas fa-spinner fa-spin" style={{ color: 'var(--gray)' }}></i>
      </div>
    );

  if (!data) return null;

  // Risk Parity Scoring
  const isLowVol = data.volatility < 40;
  const isHighMomentum = data.momentum > 0.95;
  const isLowBeta = data.beta < 1.2;

  let score = 0;
  if (isLowVol) score++;
  if (isHighMomentum) score++;
  if (isLowBeta) score++;

  let recommendation = 'HIGH RISK';
  let recColor = 'var(--danger)';
  let recIcon = 'fa-exclamation-triangle';

  if (score === 3) {
    recommendation = 'STABLE';
    recColor = 'var(--success)';
    recIcon = 'fa-shield-alt';
  } else if (score === 2) {
    recommendation = 'MODERATE';
    recColor = '#ffc107';
    recIcon = 'fa-balance-scale';
  } else if (score === 1) {
    recommendation = 'VOLATILE';
    recColor = '#ff9800';
    recIcon = 'fa-chart-line';
  }

  return (
    <div className="summary-card" style={{ position: 'relative', overflow: 'hidden' }}>
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
          zIndex: 5,
        }}
      >
        <i className={`fas ${recIcon}`}></i> {recommendation}
      </div>

      <button
        onClick={() => onRemove(symbol)}
        style={{
          position: 'absolute',
          top: '30px',
          right: '5px',
          border: 'none',
          background: 'none',
          color: 'var(--gray)',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <i className="fas fa-times"></i>
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '15px',
          marginTop: '10px',
        }}
      >
        {data.logo ? (
          <img
            src={data.logo}
            alt={data.symbol}
            style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {symbol.substring(0, 2)}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 600 }}>{data.symbol}</div>
          <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{data.name}</div>
        </div>
      </div>

      {/* Risk Metrics */}
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
          <div style={{ color: 'var(--gray)' }}>Beta</div>
          <div style={{ fontWeight: 600, color: isLowBeta ? 'var(--success)' : 'var(--danger)' }}>
            {data.beta.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--gray)' }}>Volatilité (52w)</div>
          <div style={{ fontWeight: 600, color: isLowVol ? 'var(--success)' : 'var(--warning)' }}>
            {data.volatility.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Momentum Bar */}
      <div style={{ marginBottom: '15px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--gray)' }}>Momentum (vs 52w avg)</span>
          <span
            style={{ fontWeight: 600, color: isHighMomentum ? 'var(--success)' : 'var(--danger)' }}
          >
            {(data.momentum * 100 - 100).toFixed(1)}%
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: 'var(--border-color)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(Math.max(((data.momentum - 0.8) / 0.4) * 100, 0), 100)}%`,
              background: isHighMomentum ? 'var(--success)' : 'var(--danger)',
              borderRadius: '4px',
            }}
          ></div>
        </div>
      </div>

      {/* 52w Range */}
      <div
        style={{
          background: 'var(--table-hover)',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>52w: ${data.low52w?.toFixed(0)}</span>
          <span style={{ fontWeight: 600 }}>${data.currentPrice?.toFixed(2)}</span>
          <span>${data.high52w?.toFixed(0)}</span>
        </div>
        <div
          style={{
            height: '6px',
            background: 'var(--border-color)',
            borderRadius: '3px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${data.high52w && data.low52w ? ((data.currentPrice - data.low52w) / (data.high52w - data.low52w)) * 100 : 50}%`,
              top: '-2px',
              width: '10px',
              height: '10px',
              background: 'var(--primary)',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistData, setWatchlistData] = useState({}); // Full data from Supabase
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [activeTab, setActiveTab] = useState('growth'); // 'growth' or 'riskparity'

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    // Fetch all columns including metrics from Python script
    const { data, error } = await supabase.from('watchlist').select('*');

    if (error) {
      console.error('Error fetching watchlist:', error);
    } else {
      setWatchlist(data.map((item) => item.symbol));
      // Create a map of symbol -> data for RiskParityCard
      const dataMap = {};
      data.forEach((item) => {
        dataMap[item.symbol] = item;
      });
      setWatchlistData(dataMap);
    }
  };

  const addToWatchlist = async (e) => {
    e.preventDefault();
    if (!search) return;
    const symbol = search.toUpperCase().trim();

    if (!watchlist.includes(symbol)) {
      // Optimistic update
      setWatchlist([...watchlist, symbol]);

      const { error } = await supabase.from('watchlist').insert([{ symbol }]);

      if (error) {
        console.error('Error adding to watchlist:', error);
        fetchWatchlist(); // Revert on error
      }
    }
    setSearch('');
  };

  const removeFromWatchlist = async (symbol) => {
    // Optimistic update
    setWatchlist(watchlist.filter((s) => s !== symbol));

    const { error } = await supabase.from('watchlist').delete().eq('symbol', symbol);

    if (error) {
      console.error('Error removing from watchlist:', error);
      fetchWatchlist(); // Revert on error
    }
  };

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="section-title">Watchlist & Screeners</div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '2px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => setActiveTab('growth')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom:
                activeTab === 'growth' ? '3px solid var(--success)' : '3px solid transparent',
              color: activeTab === 'growth' ? 'var(--success)' : 'var(--gray)',
              fontWeight: activeTab === 'growth' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-chart-line"></i>
            Screener Growth
          </button>
          <button
            onClick={() => setActiveTab('riskparity')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom:
                activeTab === 'riskparity' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'riskparity' ? 'var(--primary)' : 'var(--gray)',
              fontWeight: activeTab === 'riskparity' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-flask"></i>
            Screener Risk Parity
          </button>
        </div>

        {/* Tab Description */}
        <p style={{ marginBottom: '20px', color: 'var(--gray)' }}>
          {activeTab === 'growth'
            ? 'Screener Growth : Analyse automatique basée sur PE Expansion, PEG et Earnings Consistency.'
            : 'Screener Risk Parity : Analyse basée sur Beta, Volatilité et Momentum pour équilibrer le risque.'}
        </p>

        <form
          onSubmit={addToWatchlist}
          style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Symbole (ex: NVDA, KO...)"
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: 'var(--border)',
              width: '200px',
            }}
          />
          <button type="submit" className="btn btn-primary">
            Ajouter
          </button>
        </form>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {watchlist.length === 0 && (
            <div style={{ color: 'var(--gray)', fontStyle: 'italic' }}>
              Aucune action dans la watchlist.
            </div>
          )}
          {activeTab === 'growth'
            ? watchlist.map((symbol) => (
              <WatchlistCard
                key={symbol}
                symbol={symbol}
                onRemove={removeFromWatchlist}
                onClick={setSelectedStock}
              />
            ))
            : watchlist.map((symbol) => (
              <RiskParityCard
                key={symbol}
                symbol={symbol}
                onRemove={removeFromWatchlist}
                supabaseData={watchlistData[symbol]}
              />
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

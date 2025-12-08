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

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    const { data, error } = await supabase.from('watchlist').select('symbol');

    if (error) {
      console.error('Error fetching watchlist:', error);
    } else {
      setWatchlist(data.map((item) => item.symbol));
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
        <div className="section-title">Watchlist & Analyse Growth</div>
        <p style={{ marginBottom: '20px', color: 'var(--gray)' }}>
          Screener Growth : Analyse automatique basée sur PE Expansion, PEG et Earnings Consistency.
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
          {watchlist.map((symbol) => (
            <WatchlistCard
              key={symbol}
              symbol={symbol}
              onRemove={removeFromWatchlist}
              onClick={setSelectedStock}
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

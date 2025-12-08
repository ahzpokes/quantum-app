'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SummaryCards from '../components/SummaryCards';
import ChartsSection from '../components/ChartsSection';
import AddStockModal from '../components/AddStockModal';
import { supabase } from '../utils/supabaseClient';

export default function Home() {
  const [portfolio, setPortfolio] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);

      // Call update API to refresh fundamental data
      try {
        await fetch('/api/update-portfolio', { method: 'POST' });
      } catch (updateErr) {
        console.error('Error updating portfolio data:', updateErr);
        // Continue loading even if update fails
      }

      const { data, error } = await supabase.from('positions').select('*');
      if (error) throw error;

      const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      const now = new Date();

      // Separate stocks into fresh (< 24h) and stale (> 24h or null)
      const staleStocks = [];
      const freshStocks = [];

      data.forEach((pos) => {
        const lastUpdate = pos.last_price_update ? new Date(pos.last_price_update) : null;
        const hoursSinceUpdate = lastUpdate ? (now - lastUpdate) / (1000 * 60 * 60) : 999;

        if (hoursSinceUpdate < 24 && pos.current_price && pos.beta !== null) {
          // Cache is fresh, use cached data
          freshStocks.push(pos);
        } else {
          // Cache is stale or missing, need to fetch
          staleStocks.push(pos);
        }
      });

      console.log(
        `Using cached data for ${freshStocks.length} stocks, fetching ${staleStocks.length} stocks`
      );

      // Fetch data only for stale stocks
      const dataPromises = staleStocks.map(async (pos) => {
        try {
          // Fetch quote for price
          const quoteRes = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${pos.symbol}&token=${FINNHUB_KEY}`
          );
          const quote = await quoteRes.json();

          // Fetch metrics for beta
          const metricsRes = await fetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${pos.symbol}&metric=all&token=${FINNHUB_KEY}`
          );
          const metrics = await metricsRes.json();

          const currentPrice = quote.pc || Number(pos.buy_price);
          const beta = metrics?.metric?.beta || 1.0;

          // Update Supabase with new values
          await supabase
            .from('positions')
            .update({
              current_price: currentPrice,
              beta: beta,
              last_price_update: now.toISOString(),
            })
            .eq('id', pos.id);

          return {
            symbol: pos.symbol,
            currentPrice,
            beta,
          };
        } catch (err) {
          console.error(`Error fetching data for ${pos.symbol}`, err);
          return { symbol: pos.symbol, currentPrice: Number(pos.buy_price), beta: 1.0 };
        }
      });

      const fetchedData = await Promise.all(dataPromises);
      const dataMap = Object.fromEntries(fetchedData.map((d) => [d.symbol, d]));

      // Combine fresh and fetched data
      const formattedData = data.map((pos) => {
        const isFresh = freshStocks.includes(pos);
        return {
          id: pos.id,
          symbol: pos.symbol,
          name: pos.name,
          shares: Number(pos.shares),
          buyPrice: Number(pos.buy_price),
          targetPercent: Number(pos.target_percent) || 0,
          currentPrice: isFresh
            ? Number(pos.current_price)
            : dataMap[pos.symbol]?.currentPrice || Number(pos.buy_price),
          beta: isFresh ? Number(pos.beta) : dataMap[pos.symbol]?.beta || 1.0,
          sector: pos.sector || 'Autre',
          logo: pos.logo || '',
          category: pos.category || 'Satellite',
          color: pos.color || '#1a237e',
          created_at: pos.created_at, // Pass creation date
        };
      });

      setPortfolio(formattedData);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (stockData) => {
    // stockData now contains all the info fetched by the modal (including name, sector, logo, etc.)
    const {
      symbol,
      qty,
      price,
      category,
      target,
      name,
      sector,
      logo,
      pe_forward,
      pe_ratio,
      peg_ratio,
      market_cap,
      dividend_yield,
      beta,
    } = stockData;

    const newPos = {
      symbol: symbol,
      name: name || symbol,
      shares: Number(qty),
      buy_price: Number(price),
      sector: sector || 'Autre',
      logo: logo || '',
      category: category,
      target_percent: Number(target) || 0,
      color: '#1a237e',
      pe_forward: pe_forward,
      pe_ratio: pe_ratio,
      peg_ratio: peg_ratio,
      market_cap: market_cap,
      dividend_yield: dividend_yield,
      beta: beta,
      last_api_update: new Date().toISOString(),
    };

    const { error } = await supabase.from('positions').insert([newPos]);
    if (error) throw error;

    await loadPortfolio();
  };

  const handleDeleteStock = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try {
      const { error } = await supabase.from('positions').delete().eq('id', id);
      if (error) throw error;
      await loadPortfolio();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header
          onAddStock={() => setIsModalOpen(true)}
          onRefresh={loadPortfolio}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="section-title">Aperçu du portefeuille</div>
        <SummaryCards portfolio={portfolio} />

        <div className="section-title">Analyses et visualisations</div>
        <ChartsSection portfolio={portfolio} />

        <div
          style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: 'var(--border)',
            color: 'var(--gray)',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="status-indicator"></span>
              <span>Système actif</span>
            </div>
            <div>
              <span style={{ marginRight: '20px' }}>© 2023 Quantum Finance</span>
              <a
                href="#"
                style={{ color: 'var(--gray)', textDecoration: 'none', marginRight: '15px' }}
              >
                Conditions
              </a>
              <a href="#" style={{ color: 'var(--gray)', textDecoration: 'none' }}>
                Confidentialité
              </a>
            </div>
          </div>
        </div>
      </main>

      <AddStockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddStock}
      />
    </div>
  );
}

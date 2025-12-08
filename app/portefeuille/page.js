'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import PortfolioTable from '../../components/PortfolioTable';
import AddStockModal from '../../components/AddStockModal';
import { supabase } from '../../utils/supabaseClient';

export default function Portefeuille() {
  const [portfolio, setPortfolio] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('positions').select('*');
      if (error) throw error;

      const formattedData = data.map((pos) => ({
        id: pos.id,
        symbol: pos.symbol,
        name: pos.name,
        shares: Number(pos.shares),
        buyPrice: Number(pos.buy_price),
        targetPercent: Number(pos.target_percent) || 0,
        currentPrice: Number(pos.current_price) || Number(pos.buy_price),
        beta: Number(pos.beta) || 1.0,
        sector: pos.sector || 'Autre',
        logo: pos.logo || '',
        category: pos.category || 'Satellite',
        color: pos.color || '#1a237e',
        peForward: pos.pe_forward,
        pegRatio: pos.peg_ratio,
      }));

      setPortfolio(formattedData);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStock = (stock) => {
    setEditingStock(stock);
    setIsModalOpen(true);
  };

  const handleAddStock = async (stockData) => {
    const {
      id,
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

    // UPDATE EXISTING STOCK
    if (id) {
      const { error } = await supabase
        .from('positions')
        .update({
          shares: Number(qty),
          buy_price: Number(price),
          category: category,
          target_percent: Number(target),
        })
        .eq('id', id);

      if (error) throw error;
    }
    // ADD NEW STOCK
    else {
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
    }

    await loadPortfolio();
    setEditingStock(null);
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
          onAddStock={() => {
            setEditingStock(null);
            setIsModalOpen(true);
          }}
          onRefresh={loadPortfolio}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="section-title">Détail des positions</div>
        <PortfolioTable
          portfolio={portfolio}
          onDelete={handleDeleteStock}
          onEdit={handleEditStock}
        />
      </main>

      <AddStockModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStock(null);
        }}
        onAdd={handleAddStock}
        initialData={editingStock}
      />
    </div>
  );
}

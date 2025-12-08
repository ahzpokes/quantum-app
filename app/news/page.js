'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../utils/supabaseClient';

const NewsCard = ({ news }) => {
  return (
    <a
      href={news.link}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
      style={{
        display: 'flex',
        gap: '15px',
        padding: '15px',
        background: 'var(--card-bg)',
        borderRadius: '12px',
        textDecoration: 'none',
        color: 'inherit',
        border: '1px solid var(--border-color)',
        marginBottom: '15px',
        transition: 'transform 0.2s',
      }}
    >
      <div
        style={{
          width: '100px',
          height: '100px',
          flexShrink: 0,
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ccc',
        }}
      >
        {news.image ? (
          <img
            src={news.image}
            alt={news.title || 'news'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) parent.innerHTML = '<i class="fas fa-newspaper fa-2x"></i>';
            }}
          />
        ) : (
          <i className="fas fa-newspaper fa-2x"></i>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--primary)',
            fontWeight: 600,
            marginBottom: '5px',
            textTransform: 'uppercase',
          }}
        >
          {news.symbol} • {new Date(news.pubDate).toLocaleDateString('fr-FR')}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4' }}>
          {news.title}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--gray)',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {news.contentSnippet}
        </p>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '10px' }}>
          Source: {news.source}
        </div>
      </div>
    </a>
  );
};

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'earnings', 'general'
  const [portfolioSymbols, setPortfolioSymbols] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);

      const { data: stocks } = await supabase.from('positions').select('symbol, name');

      if (!stocks || stocks.length === 0) {
        setLoading(false);
        return;
      }

      const allSymbols = stocks.map((s) => s.symbol).sort();
      setPortfolioSymbols(allSymbols);

      const res = await fetch('/api/news-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks: stocks }),
      });

      const data = await res.json();

      if (data.news && Array.isArray(data.news)) {
        setNews(data.news);
      }
    } catch (err) {
      console.error('Error loading news:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by symbol AND category
  let filteredNews = news;
  if (selectedSymbol !== 'All') {
    filteredNews = filteredNews.filter((item) => item.symbol === selectedSymbol);
  }
  if (selectedCategory !== 'all') {
    filteredNews = filteredNews.filter((item) => item.category === selectedCategory);
  }

  // Count by category for badge display
  const earningsCount = news.filter((n) => n.category === 'earnings').length;
  const generalCount = news.filter((n) => n.category === 'general').length;

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div className="section-title" style={{ marginBottom: 0 }}>
            Actualités du Portefeuille
          </div>

          {portfolioSymbols.length > 0 && (
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'var(--border)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="All">Toutes les actions</option>
              {portfolioSymbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '2px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom:
                selectedCategory === 'all' ? '3px solid var(--primary)' : '3px solid transparent',
              color: selectedCategory === 'all' ? 'var(--primary)' : 'var(--gray)',
              fontWeight: selectedCategory === 'all' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            Toutes ({news.length})
          </button>
          <button
            onClick={() => setSelectedCategory('earnings')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom:
                selectedCategory === 'earnings' ? '3px solid #dc3545' : '3px solid transparent',
              color: selectedCategory === 'earnings' ? '#dc3545' : 'var(--gray)',
              fontWeight: selectedCategory === 'earnings' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            Résultats ({earningsCount})
          </button>
          <button
            onClick={() => setSelectedCategory('general')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom:
                selectedCategory === 'general' ? '3px solid var(--gray)' : '3px solid transparent',
              color: selectedCategory === 'general' ? 'var(--text-primary)' : 'var(--gray)',
              fontWeight: selectedCategory === 'general' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            Actualités ({generalCount})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <div style={{ marginTop: '10px' }}>Chargement des actualités...</div>
          </div>
        ) : filteredNews.length > 0 ? (
          <div style={{ maxWidth: '800px' }}>
            {filteredNews.map((item, index) => (
              <NewsCard key={item.link || index} news={item} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
            {selectedSymbol === 'All'
              ? 'Aucune actualité récente trouvée.'
              : `Aucune actualité trouvée pour ${selectedSymbol}.`}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import { HeaderProps } from '@/types';

const Header: React.FC<
  HeaderProps & {
    onAddStock?: () => void;
    onToggleMobileMenu?: () => void;
  }
> = ({ onSearch, onRefresh, lastUpdated, onAddStock, onToggleMobileMenu }) => {
  const [dateStr, setDateStr] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('fr-FR'));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {onToggleMobileMenu && (
          <button className="mobile-menu-btn" onClick={onToggleMobileMenu} aria-label="Menu mobile">
            <i className="fas fa-bars"></i>
          </button>
        )}
        <div>
          <h1>Dashboard Portfolio</h1>
          <p style={{ color: 'var(--gray)', marginTop: '5px', fontSize: '14px' }}>
            Suivi et analyse de vos investissements
          </p>
        </div>
      </div>

      <div className="header-controls">
        <div className="date-display">
          <i className="far fa-calendar-alt" style={{ marginRight: '8px' }}></i>
          <span id="current-date">{dateStr}</span>
          {lastUpdated && (
            <span style={{ marginLeft: '15px', fontSize: '0.9em', color: 'var(--gray)' }}>
              Dernière mise à jour: {lastUpdated}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onAddStock && (
            <button className="btn btn-primary" onClick={onAddStock} aria-label="Ajouter un actif">
              <i className="fas fa-plus"></i> Ajouter
            </button>
          )}
          {onRefresh && (
            <button
              className="btn btn-secondary"
              onClick={onRefresh}
              aria-label="Actualiser les données"
            >
              <i className="fas fa-sync-alt"></i> Actualiser
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

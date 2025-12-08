'use client';
import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

export default function Parametres() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="section-title">Paramètres</div>

        <div
          style={{
            background: 'var(--card-bg)',
            padding: '30px',
            borderRadius: '12px',
            border: 'var(--border)',
            maxWidth: '600px',
            marginTop: '20px',
          }}
        >
          <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Données Fondamentales</h3>
          <p style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '20px' }}>
            Mettre à jour les données fondamentales (Secteur, Industrie, PE, Beta, etc.) depuis
            Yahoo Finance.
          </p>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              if (
                !confirm('Mettre à jour toutes les données ? Cela peut prendre quelques secondes.')
              )
                return;
              try {
                const res = await fetch('/api/update-portfolio', { method: 'POST' });
                const data = await res.json();
                alert(data.message || 'Mise à jour terminée !');
              } catch (err) {
                console.error(err);
                alert('Erreur lors de la mise à jour');
              }
            }}
          >
            <i className="fas fa-sync-alt" style={{ marginRight: '8px' }}></i>
            Mettre à jour les données
          </button>
        </div>
      </main>
    </div>
  );
}

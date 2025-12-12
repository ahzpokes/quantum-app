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
          <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Analyse Risk Parity (GitHub)</h3>
          <p style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '20px' }}>
            Déclencher manuellement le script Python "Risk Parity" via GitHub Actions.
            Cela mettra à jour les métriques avancées (Volatilité, Momentum, etc.).
          </p>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
            onClick={async () => {
              if (
                !confirm('Lancer l\'analyse Risk Parity sur GitHub ? Cela prendra environ 1-2 minutes.')
              )
                return;
              try {
                const res = await fetch('/api/github/dispatch-risk-parity', { method: 'POST' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
                alert(data.message || 'Action déclenchée !');
              } catch (err) {
                console.error(err);
                alert(`Erreur : ${err.message}`);
              }
            }}
          >
            <i className="fas fa-play" style={{ marginRight: '8px' }}></i>
            Lancer l'analyse
          </button>
        </div>
      </main>
    </div>
  );
}

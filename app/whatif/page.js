'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../utils/supabaseClient';

export default function WhatIf() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      // Fetch basic columns that definitely exist
      const { data, error } = await supabase.from('positions').select('*');

      if (error) throw error;

      if (data) {
        // Get latest update timestamp
        const dates = data.filter((d) => d.updated_at).map((d) => new Date(d.updated_at));
        if (dates.length > 0) {
          const latestDate = new Date(Math.max(...dates));
          setLastUpdated(latestDate.toLocaleString('fr-FR'));
        }

        // Calcul de la valeur totale
        const total = data.reduce((sum, pos) => {
          return sum + Number(pos.shares) * Number(pos.current_price || pos.buy_price);
        }, 0);
        setTotalValue(total);

        // Ajout des calculs pour chaque position
        const enrichedData = data.map((pos) => {
          const currentValue = Number(pos.shares) * Number(pos.current_price || pos.buy_price);
          const currentAllocation = total > 0 ? (currentValue / total) * 100 : 0;
          const targetAllocation = pos.risk_parity_target || 0;
          const diff = targetAllocation - currentAllocation;
          const momentumRatio = pos.momentum_ratio || 1;
          const peRatio = pos.pe_ratio || 0;
          const growthEst = pos.growth_est || 0;

          return {
            ...pos,
            currentValue,
            currentAllocation,
            targetAllocation,
            diff,
            momentumRatio,
            peRatio,
            growthEst,
          };
        });

        // Trier par target allocation décroissante
        enrichedData.sort((a, b) => b.targetAllocation - a.targetAllocation);
        setPositions(enrichedData);
      }
    } catch (err) {
      console.error('Error loading positions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="app-container">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <div className="section-title">
          <i className="fas fa-flask" style={{ marginRight: '10px', color: 'var(--primary)' }}></i>
          What If - Simulation Risk Parity
        </div>

        <div
          className="summary-card"
          style={{
            marginBottom: '20px',
            background: 'linear-gradient(135deg, var(--sidebar-bg), var(--primary))',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <i className="fas fa-info-circle" style={{ fontSize: '24px' }}></i>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Allocations calculées par l'algorithme <strong>Risk Parity</strong> avec{' '}
                <strong>Volatility Floor (25%)</strong> et <strong>Filtre Momentum (MM200)</strong>.
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
                {lastUpdated
                  ? `Dernière mise à jour : ${lastUpdated}`
                  : 'Mise à jour via GitHub Actions'}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <div style={{ marginTop: '10px' }}>Chargement des données...</div>
          </div>
        ) : positions.length === 0 ? (
          <div className="summary-card" style={{ textAlign: 'center', color: 'var(--gray)' }}>
            <i
              className="fas fa-exclamation-triangle"
              style={{ fontSize: '24px', marginBottom: '10px' }}
            ></i>
            <p>Aucune position trouvée. Ajoutez des actions dans votre portefeuille.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="summary-cards" style={{ marginBottom: '30px' }}>
              <div className="summary-card">
                <div style={{ fontSize: '12px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                  Valeur Totale
                </div>
                <div className="card-value">{formatCurrency(totalValue)}</div>
              </div>
              <div className="summary-card">
                <div style={{ fontSize: '12px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                  Nombre d'actifs
                </div>
                <div className="card-value">{positions.length}</div>
              </div>
              <div className="summary-card">
                <div style={{ fontSize: '12px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                  Écart moyen
                </div>
                <div className="card-value">
                  {(
                    positions.reduce((sum, p) => sum + Math.abs(p.diff), 0) / positions.length
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="summary-card">
                <div style={{ fontSize: '12px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                  Momentum moyen
                </div>
                <div
                  className="card-value"
                  style={{
                    color:
                      positions.reduce((sum, p) => sum + p.momentumRatio, 0) / positions.length >=
                      0.95
                        ? 'var(--success)'
                        : 'var(--warning)',
                  }}
                >
                  {(
                    (positions.reduce((sum, p) => sum + p.momentumRatio, 0) / positions.length -
                      1) *
                    100
                  ).toFixed(1)}
                  %
                </div>
              </div>
            </div>

            {/* Positions Grid */}
            <div
              style={{
                display: 'grid',
                gap: '15px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              }}
            >
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  className="summary-card"
                  style={{
                    borderLeft: `4px solid ${pos.diff > 0 ? 'var(--success)' : pos.diff < -2 ? 'var(--danger)' : 'var(--warning)'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {pos.logo ? (
                        <img
                          src={pos.logo}
                          alt={pos.symbol}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            objectFit: 'contain',
                            background: 'white',
                            padding: '4px',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        >
                          {pos.symbol.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '16px' }}>{pos.symbol}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{pos.name}</div>
                      </div>
                    </div>
                    <span
                      className={`badge ${pos.diff > 0 ? 'badge-success' : 'badge-danger'}`}
                      style={{ fontSize: '11px' }}
                    >
                      {pos.diff > 0 ? '+' : ''}
                      {pos.diff.toFixed(1)}%
                    </span>
                  </div>

                  {/* Metrics from Python script */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                      marginBottom: '15px',
                      padding: '10px',
                      background: 'var(--table-hover)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--gray)' }}>Momentum</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: pos.momentumRatio >= 0.95 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {pos.momentumRatio ? `${((pos.momentumRatio - 1) * 100).toFixed(1)}%` : '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--gray)' }}>PE Ratio</div>
                      <div style={{ fontWeight: 600 }}>
                        {pos.peRatio ? pos.peRatio.toFixed(1) : '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--gray)' }}>Growth Est.</div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {pos.growthEst ? `${(pos.growthEst * 100).toFixed(0)}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Allocation Bars */}
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <span>Actuelle</span>
                      <span style={{ fontWeight: 600 }}>{pos.currentAllocation.toFixed(1)}%</span>
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
                          width: `${Math.min(pos.currentAllocation, 100)}%`,
                          background: 'var(--gray)',
                          borderRadius: '4px',
                        }}
                      ></div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        <i className="fas fa-flask" style={{ marginRight: '5px' }}></i>
                        Cible Risk Parity
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {pos.targetAllocation.toFixed(1)}%
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
                          width: `${Math.min(pos.targetAllocation, 100)}%`,
                          background: 'var(--primary)',
                          borderRadius: '4px',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Momentum indicator */}
                  {pos.momentumRatio < 0.95 && (
                    <div
                      style={{
                        padding: '8px',
                        background: 'rgba(220, 53, 69, 0.1)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: 'var(--danger)',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Momentum négatif - Poids réduit de 50%</span>
                    </div>
                  )}

                  {/* Action suggestion */}
                  <div
                    style={{
                      padding: '10px',
                      background:
                        pos.diff > 2
                          ? 'rgba(40, 167, 69, 0.1)'
                          : pos.diff < -2
                            ? 'rgba(220, 53, 69, 0.1)'
                            : 'rgba(255, 193, 7, 0.1)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <i
                      className={`fas ${pos.diff > 2 ? 'fa-arrow-up' : pos.diff < -2 ? 'fa-arrow-down' : 'fa-check'}`}
                      style={{
                        color:
                          pos.diff > 2
                            ? 'var(--success)'
                            : pos.diff < -2
                              ? 'var(--danger)'
                              : 'var(--warning)',
                      }}
                    ></i>
                    <span>
                      {pos.diff > 2
                        ? `Acheter pour atteindre ${pos.targetAllocation.toFixed(1)}%`
                        : pos.diff < -2
                          ? `Vendre pour réduire à ${pos.targetAllocation.toFixed(1)}%`
                          : 'Position équilibrée'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { supabase } from '../../utils/supabaseClient';

export default function Alertes() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAlerts();
  }, []);

  const checkAlerts = async () => {
    setLoading(true);
    try {
      const { data: positions } = await supabase.from('positions').select('*');

      if (!positions || positions.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      const generatedAlerts = [];

      // 1. Calculate Portfolio Total
      const totalValue = positions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0);

      // 2. Risk Parity Analysis
      positions.forEach(pos => {
        const currentValue = pos.shares * pos.currentPrice;
        const currentAllocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        const targetAllocation = pos.risk_parity_target || 0;

        // Threshold for alert (e.g. 2% deviation)
        const diff = targetAllocation - currentAllocation;

        if (targetAllocation > 0 && Math.abs(diff) > 2.0) {
          generatedAlerts.push({
            type: 'risk_parity',
            level: 'danger', // or warning
            symbol: pos.symbol,
            message: `Allocation actuelle (${currentAllocation.toFixed(1)}%) loin de la cible (${targetAllocation.toFixed(1)}%). Écart de ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%.`,
            action: 'Rééquilibrer'
          });
        }
      });

      // 3. Price Alerts (Example logic - could be expanded)
      // generatedAlerts.push({ type: 'price', level: 'warning', symbol: 'AAPL', message: 'Approche du plus haut historique.' });

      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="section-title">Alertes actives</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
            <i className="fas fa-spinner fa-spin"></i> Analyse en cours...
          </div>
        ) : alerts.length === 0 ? (
          <div className="summary-card" style={{ textAlign: 'center', color: 'var(--success)' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
            <p>Aucune alerte. Votre portefeuille est équilibré.</p>
          </div>
        ) : (
          <div className="summary-cards" style={{ gridTemplateColumns: '1fr' }}>
            {alerts.map((alert, index) => (
              <div key={index} className="summary-card" style={{ borderLeft: `4px solid var(--${alert.level === 'danger' ? 'danger' : 'warning'})` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>
                    {alert.type === 'risk_parity' ? 'Rééquilibrage requis' : 'Indicateur'} : {alert.symbol}
                  </div>
                  <span className={`badge badge-${alert.level === 'danger' ? 'danger' : 'warning'}`}>
                    {alert.level === 'danger' ? 'Urgent' : 'Info'}
                  </span>
                </div>
                <p style={{ margin: '10px 0', fontSize: '14px', color: 'var(--gray)' }}>
                  {alert.message}
                </p>
                {alert.action && (
                  <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    {alert.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

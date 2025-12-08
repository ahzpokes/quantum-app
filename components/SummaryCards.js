import React from 'react';

const SummaryCards = ({ portfolio }) => {
  const totalValue = portfolio.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const totalBuy = portfolio.reduce((sum, p) => sum + p.shares * p.buyPrice, 0);
  const totalDiff = totalValue - totalBuy;
  const totalPerf = totalBuy > 0 ? (totalDiff / totalBuy) * 100 : 0;

  // Calculate portfolio Beta (weighted average)
  const portfolioBeta =
    portfolio.length > 0
      ? portfolio.reduce((sum, p) => {
          const weight = (p.shares * p.currentPrice) / totalValue;
          return sum + (p.beta || 1.0) * weight;
        }, 0)
      : 1.0;

  // Calculate number of unique sectors
  const uniqueSectors = new Set(portfolio.map((p) => p.sector).filter((s) => s && s !== 'Autre'));
  const sectorCount = uniqueSectors.size;

  // Determine risk level based on Beta
  let riskLevel = 'Modéré';
  let riskColor = 'var(--warning)';
  if (portfolioBeta < 0.8) {
    riskLevel = 'Faible';
    riskColor = 'var(--success)';
  } else if (portfolioBeta > 1.2) {
    riskLevel = 'Élevé';
    riskColor = 'var(--danger)';
  }

  // Calculate positions in gain vs loss
  const positionsInGain = portfolio.filter((p) => p.currentPrice - p.buyPrice > 0).length;
  const positionsInLoss = portfolio.filter((p) => p.currentPrice - p.buyPrice < 0).length;
  const totalPositions = portfolio.length;
  const gainPercentage = totalPositions > 0 ? (positionsInGain / totalPositions) * 100 : 0;

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div style={{ color: 'var(--gray)', fontWeight: 600, fontSize: '13px' }}>Valeur totale</div>
        <div className="card-value">
          {totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </div>
        <div className={`card-change ${totalDiff >= 0 ? 'change-up' : 'change-down'}`}>
          <i className={`fas ${totalDiff >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
          <span>
            {totalDiff >= 0 ? '+' : ''}
            {totalPerf.toFixed(1)}% (
            {totalDiff.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})
          </span>
        </div>
      </div>

      <div className="summary-card">
        <div style={{ color: 'var(--gray)', fontWeight: 600, fontSize: '13px' }}>
          Performance totale
        </div>
        <div className="card-value">
          {totalPerf >= 0 ? '+' : ''}
          {totalPerf.toFixed(1)}%
        </div>
        <div className={`card-change ${totalDiff >= 0 ? 'change-up' : 'change-down'}`}>
          <i className="fas fa-chart-line" />
          <span>
            {totalDiff >= 0 ? '+' : ''}
            {totalDiff.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>
      </div>

      <div className="summary-card">
        <div style={{ color: 'var(--gray)', fontWeight: 600, fontSize: '13px' }}>Positions</div>
        <div
          style={{
            marginTop: '15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <svg width="120" height="70" viewBox="0 0 120 70" style={{ overflow: 'visible' }}>
            {/* Background arc */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Gain arc (green) */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="var(--success)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(gainPercentage / 100) * 157} 157`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            {/* Center text */}
            <text
              x="60"
              y="55"
              textAnchor="middle"
              fontSize="20"
              fontWeight="bold"
              fill="var(--text-color)"
            >
              {gainPercentage.toFixed(0)}%
            </text>
          </svg>
          <div style={{ display: 'flex', gap: '15px', fontSize: '11px', marginTop: '5px' }}>
            <span style={{ color: 'var(--success)' }}>✓ {positionsInGain} gains</span>
            <span style={{ color: 'var(--danger)' }}>✗ {positionsInLoss} pertes</span>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div style={{ color: 'var(--gray)', fontWeight: 600, fontSize: '13px' }}>
          Risque du portefeuille
        </div>
        <div className="card-value" style={{ color: riskColor }}>
          {riskLevel}
        </div>
        <div className="card-change" style={{ color: 'var(--gray)' }}>
          <i className="fas fa-chart-area" />
          <span>
            Beta: {portfolioBeta.toFixed(2)} • {sectorCount} secteur{sectorCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;

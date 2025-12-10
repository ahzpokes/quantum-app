import React from 'react';
import Image from 'next/image';

const PortfolioTable = ({ portfolio, onDelete, onEdit }) => {
  const [sortConfig, setSortConfig] = React.useState({ key: 'default', direction: 'desc' });
  const totalValue = portfolio.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);

  const handleSortChange = (e) => {
    const value = e.target.value;
    if (value === 'Performance') setSortConfig({ key: 'performance', direction: 'desc' });
    if (value === 'Poids') setSortConfig({ key: 'weight', direction: 'desc' });
    if (value === 'Défaut') setSortConfig({ key: 'default', direction: 'desc' });
  };

  const sortedPortfolio = [...portfolio].sort((a, b) => {
    const valueA = a.shares * a.currentPrice;
    const valueB = b.shares * b.currentPrice;
    const perfA = ((a.currentPrice - a.buyPrice) / a.buyPrice) * 100;
    const perfB = ((b.currentPrice - b.buyPrice) / b.buyPrice) * 100;
    const weightA = totalValue > 0 ? (valueA / totalValue) * 100 : 0;
    const weightB = totalValue > 0 ? (valueB / totalValue) * 100 : 0;

    if (sortConfig.key === 'default') {
      const catWeight = { Pilier: 3, Satellite: 2, Pari: 1 };
      const wA = catWeight[a.category] || 0;
      const wB = catWeight[b.category] || 0;
      if (wA !== wB) return wB - wA; // Higher category first
      return perfB - perfA; // Then higher performance first
    }

    if (sortConfig.key === 'performance')
      return sortConfig.direction === 'asc' ? perfA - perfB : perfB - perfA;
    if (sortConfig.key === 'weight')
      return sortConfig.direction === 'asc' ? weightA - weightB : weightB - weightA;
    if (sortConfig.key === 'value')
      return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
    return 0;
  });

  return (
    <div className="portfolio-table-container">
      <div className="table-header">
        <div className="chart-title">Positions actives</div>
        <div className="table-controls">
          <input
            type="text"
            placeholder="Rechercher un actif..."
            className="search-input"
          />
          <select
            onChange={handleSortChange}
            className="sort-select"
          >
            <option value="Défaut">Trier par: Défaut</option>
            <option value="Performance">Trier par: Performance</option>
            <option value="Poids">Trier par: Poids</option>
          </select>
        </div>
      </div>

      <table id="portfolio-table">
        <thead>
          <tr>
            <th>Actif</th>
            <th>Quantité</th>
            <th>{"Prix d'achat"}</th>
            <th>Prix actuel</th>
            <th>Valeur</th>
            <th>Performance</th>
            <th>Cible / Écart</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedPortfolio.map((stock) => {
            const value = stock.shares * stock.currentPrice;
            const perf = ((stock.currentPrice - stock.buyPrice) / stock.buyPrice) * 100;
            const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
            const gap = weight - stock.targetPercent;
            const isAlert = Math.abs(gap) > 2;

            let catIcon = 'fa-satellite';
            let catClass = 'cat-satellite';
            if (stock.category === 'Pilier') {
              catIcon = 'fa-layer-group';
              catClass = 'cat-pilier';
            }
            if (stock.category === 'Pari') {
              catIcon = 'fa-rocket';
              catClass = 'cat-pari';
            }

            return (
              <tr key={stock.id}>
                <td data-label="Actif" className="mobile-header-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {stock.logo ? (
                      <Image
                        src={stock.logo}
                        alt={stock.name || stock.symbol || ''}
                        width={36}
                        height={36}
                        style={{
                          borderRadius: '8px',
                          objectFit: 'contain',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: stock.color || '#1a237e',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '10px',
                        }}
                      >
                        {stock.symbol.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{stock.symbol}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{stock.name}</div>
                      <div className={`cat-badge ${catClass}`} style={{ marginTop: '2px' }}>
                        <i className={`fas ${catIcon}`}></i> {stock.category}
                      </div>
                    </div>
                  </div>
                </td>
                <td data-label="Quantité" style={{ fontWeight: 500 }}>{stock.shares}</td>
                <td data-label="Prix d'achat" style={{ color: 'var(--gray)' }}>{stock.buyPrice.toFixed(1)} $</td>
                <td data-label="Prix actuel" style={{ fontWeight: 600 }}>{stock.currentPrice.toFixed(1)} $</td>
                <td data-label="Valeur" style={{ fontWeight: 600 }}>{value.toFixed(1)} $</td>
                <td data-label="Performance">
                  <span className={`badge ${perf >= 0 ? 'badge-success' : 'badge-danger'}`}>
                    <i
                      className={`fas ${perf >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}
                      style={{ fontSize: '10px', marginRight: '4px' }}
                    ></i>
                    {Math.abs(perf).toFixed(2)}%
                  </span>
                </td>
                <td data-label="Cible / Écart">
                  <div style={{ fontSize: '12px' }}>
                    Cible: <b>{stock.targetPercent}%</b>
                  </div>
                  {isAlert ? (
                    <div className="alert-badge">
                      <i className="fas fa-exclamation-triangle"></i> {gap > 0 ? '+' : ''}
                      {gap.toFixed(1)}%
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#999' }}>OK ({weight.toFixed(1)}%)</div>
                  )}
                </td>
                <td data-label="Actions" className="actions-cell">
                  <button
                    onClick={() => onEdit(stock)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      marginRight: '10px',
                    }}
                  >
                    <i className="fas fa-pencil-alt"></i>
                  </button>
                  <button
                    onClick={() => onDelete(stock.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PortfolioTable;

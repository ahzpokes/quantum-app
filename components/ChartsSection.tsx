'use client';

import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { PortfolioAsset } from '@/types';

ChartJS.register(...registerables);

interface HistoryData {
  date: string;
  value: number;
}

interface ChartsSectionProps {
  portfolio: PortfolioAsset[];
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: '1M' | '3M' | '1Y' | 'ALL';
  className?: string;
  historyData?: Array<{ date: string; value: number }>; // Ajout du type pour historyData
}

const COLORS = [
  '#1a237e',
  '#0056b3',
  '#dc3545',
  '#ffc107',
  '#28a745',
  '#17a2b8',
  '#6610f2',
  '#e83e8c',
  '#fd7e14',
  '#20c997',
];

const ChartsSection: React.FC<ChartsSectionProps> = ({
  portfolio = [],
  onPeriodChange = () => { },
  selectedPeriod = '1M',
  className = '',
}): JSX.Element => {


  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Charger l'historique du portefeuille
  useEffect(() => {
    if (portfolio.length > 0) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        setError(null);

        try {
          const response = await fetch('/api/portfolio-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              positions: portfolio,
              period: selectedPeriod,
            }),
          });

          if (!response.ok) {
            throw new Error("Erreur lors du chargement de l'historique");
          }

          const data = await response.json();
          if (data.history) {
            setHistoryData(data.history);
          }
        } catch (err) {
          console.error('Error fetching history:', err);
          setError(
            err instanceof Error ? err.message : "Erreur lors du chargement de l'historique"
          );
        } finally {
          setLoadingHistory(false);
        }
      };

      fetchHistory();
    }
  }, [portfolio, selectedPeriod]);

  // Préparer les données pour le graphique en secteurs (Doughnut)
  const sectors = portfolio.reduce<Record<string, number>>((acc, asset) => {
    const sector = asset.sector || 'Autre';
    const value = asset.shares * asset.currentPrice;
    acc[sector] = (acc[sector] || 0) + value;
    return acc;
  }, {});

  const doughnutData: ChartData<'doughnut'> = {
    labels: Object.keys(sectors),
    datasets: [
      {
        data: Object.values(sectors),
        backgroundColor: COLORS.slice(0, Object.keys(sectors).length) as string[],
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            family: 'Inter, sans-serif',
            size: 13,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value.toFixed(2)}$ (${percentage}%)`;
          },
        },
      },
    },
  };

  // Préparer les données pour le graphique de performance (Line)
  const lineData: ChartData<'line'> = {
    labels: historyData.map((item: { date: string }) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
      });
    }),
    datasets: [
      {
        label: 'Valeur du portefeuille',
        data: historyData.map((item: { value: number }) => item.value),
        // ... reste des propriétés inchangées
      },
    ],
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const value =
              typeof context.parsed.y === 'number' ? context.parsed.y.toFixed(2) : '0.00';
            return `${context.dataset.label}: ${value}$`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `${value}$`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Gérer le changement de période
  const handlePeriodChange = (period: string) => {
    if (onPeriodChange) {
      onPeriodChange(period);
    }
  };

  return (
    <div className={`charts-section ${className}`}>
      {/* Graphique de répartition par secteur */}
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">
            Répartition par secteur
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--gray)' }}>
            {portfolio.length} actif{portfolio.length > 1 ? 's' : ''}
          </span>
        </div>

        {portfolio.length > 0 ? (
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)' }}>
            Aucune donnée disponible
          </div>
        )}
      </div>

      {/* Graphique de performance */}
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Performance</h3>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['1M', '3M', '1Y', 'ALL'].map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`btn ${selectedPeriod === period ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '12px', minHeight: '30px' }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary)' }}></div>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--danger)' }}>
            <span style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</span>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
            >
              Réessayer
            </button>
          </div>
        ) : historyData.length > 0 ? (
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)' }}>
            {"Aucune donnée d'historique disponible"}
          </div>
        )}
      </div>
    </div >
  );
};

export default ChartsSection;

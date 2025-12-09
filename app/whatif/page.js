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

    useEffect(() => {
        loadPositions();
    }, []);

    const loadPositions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('positions')
                .select('id, symbol, name, shares, buy_price, current_price, risk_parity_target, logo, category');

            if (error) throw error;

            if (data) {
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

                    return {
                        ...pos,
                        currentValue,
                        currentAllocation,
                        targetAllocation,
                        diff,
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
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
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
                                Cette page affiche les allocations calculées par l'algorithme <strong>Risk Parity</strong> (Equal Risk Contribution).
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
                                Dernière mise à jour via GitHub Actions
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
                        <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
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
                                    {(positions.reduce((sum, p) => sum + Math.abs(p.diff), 0) / positions.length).toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        {/* Positions Grid */}
                        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                            {positions.map((pos) => (
                                <div
                                    key={pos.id}
                                    className="summary-card"
                                    style={{
                                        borderLeft: `4px solid ${pos.diff > 0 ? 'var(--success)' : pos.diff < -2 ? 'var(--danger)' : 'var(--warning)'}`,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {pos.logo ? (
                                                <img
                                                    src={pos.logo}
                                                    alt={pos.symbol}
                                                    style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', background: 'white', padding: '4px' }}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
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
                                            {pos.diff > 0 ? '+' : ''}{pos.diff.toFixed(1)}%
                                        </span>
                                    </div>

                                    {/* Allocation Bars */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                                            <span>Actuelle</span>
                                            <span style={{ fontWeight: 600 }}>{pos.currentAllocation.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                                                <i className="fas fa-flask" style={{ marginRight: '5px' }}></i>
                                                Cible Risk Parity
                                            </span>
                                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pos.targetAllocation.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
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

                                    {/* Action suggestion */}
                                    <div
                                        style={{
                                            padding: '10px',
                                            background: pos.diff > 2 ? 'rgba(40, 167, 69, 0.1)' : pos.diff < -2 ? 'rgba(220, 53, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
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
                                                color: pos.diff > 2 ? 'var(--success)' : pos.diff < -2 ? 'var(--danger)' : 'var(--warning)',
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

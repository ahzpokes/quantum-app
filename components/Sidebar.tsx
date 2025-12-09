'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { SidebarProps } from '@/types';
import { useAuth } from './AuthProvider';

const Sidebar: React.FC<SidebarProps & { mobileOpen?: boolean; onCloseMobile?: () => void }> = ({
  activeTab,
  onTabChange,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const [theme, setTheme] = useState<string>('light');
  const [performance, setPerformance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    // Load theme from localStorage on mount (client-side only)
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Fetch performance data
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('shares, buy_price, current_price');

      if (error) throw error;

      if (data) {
        let totalInvested = 0;
        let totalCurrentValue = 0;

        data.forEach((pos: { shares: number; buy_price: number; current_price: number }) => {
          totalInvested += Number(pos.shares) * Number(pos.buy_price);
          totalCurrentValue += Number(pos.shares) * Number(pos.current_price);
        });

        const perf =
          totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
        setPerformance(Number(perf.toFixed(2)));
      }
    } catch (err) {
      console.error('Error fetching sidebar performance:', err);
      setError('Erreur lors du chargement des performances');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const handleLogout = async () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut();
    }
  };

  const navItems = [
    { path: '/', icon: 'fas fa-home', label: 'Tableau de bord' },
    { path: '/portefeuille', icon: 'fas fa-chart-line', label: 'Portefeuille' },
    { path: '/watchlist', icon: 'fas fa-star', label: 'Watchlist' },
    { path: '/analyse', icon: 'fas fa-chart-pie', label: 'Analyse' },
    { path: '/news', icon: 'far fa-newspaper', label: 'Actualités' },
    { path: '/alertes', icon: 'fas fa-bell', label: 'Alertes' },
    { path: '/parametres', icon: 'fas fa-cog', label: 'Paramètres' },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h2>Quantum Finance</h2>
        {mobileOpen && onCloseMobile && (
          <button className="close-sidebar" onClick={onCloseMobile}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      <div className="performance-widget">
        <div className="performance-label">Performance globale</div>
        {isLoading ? (
          <div className="loading">Chargement...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className={`performance-value ${performance >= 0 ? 'positive' : 'negative'}`}>
            {performance >= 0 ? '+' : ''}
            {performance}%
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`nav-link ${pathname === item.path ? 'active' : ''}`}
                onClick={() => {
                  onTabChange?.(item.path);
                  onCloseMobile?.();
                }}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="theme-toggle">
        <button onClick={toggleTheme} className="theme-toggle-btn">
          <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
          <span>{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>
        </button>
      </div>

      {user && (
        <div className="sidebar-user">
          <div className="user-info">
            <i className="fas fa-user-circle"></i>
            <span className="user-email">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

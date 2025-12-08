// Types pour les actions du portefeuille
export type PortfolioAction = 'buy' | 'sell' | 'edit' | 'delete';

// Interface pour un actif dans le portefeuille
export interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  targetPercent?: number;
  beta?: number;
  sector?: string;
  industry?: string;
  category?: string;
  logo?: string;
  color?: string;
  created_at?: string;
}

// Interface pour les données d'un stock
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  peRatio?: number;
  beta?: number;
  volume?: number;
  avgVolume?: number;
  open?: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  yearHigh?: number;
  yearLow?: number;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  image?: string;
}

// Interface pour les données de graphique
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    tension?: number;
  }[];
}

// Interface pour les props des composants
export interface ChartSectionProps {
  portfolioData: PortfolioAsset[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export interface PortfolioTableProps {
  assets: PortfolioAsset[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRowClick: (symbol: string) => void;
  onAddTransaction: () => void;
}

export interface StockDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockData | null;
  onAddToPortfolio: (symbol: string) => void;
}

export interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (stock: Omit<PortfolioAsset, 'id'>) => Promise<void>;
  existingSymbols: string[];
}

export interface SummaryCardsProps {
  portfolioValue: number;
  totalGain: number;
  gainPercentage: number;
  cashBalance: number;
  onAddFunds: () => void;
}

export interface HeaderProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  lastUpdated: string;
}

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

import React, { useState, useEffect, useCallback } from 'react';
import { StockData, PortfolioAsset } from '@/types';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (stock: any) => Promise<void>;
  initialData?: {
    id?: string | number;
    symbol: string;
    shares: number;
    buyPrice: number;
    category: string;
    targetPercent: number;
  };
  existingSymbols?: string[];
}

interface FormData {
  symbol: string;
  qty: string;
  price: string;
  category: string;
  target: string;
}

const DEFAULT_FORM_DATA: FormData = {
  symbol: '',
  qty: '',
  price: '',
  category: 'Satellite',
  target: '',
};

const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialData,
  existingSymbols = [],
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [stockInfo, setStockInfo] = useState<StockData | null>(null);

  // Type guard pour la catégorie
  const getValidCategory = (category: string): string => {
    return category === 'Pilier' || category === 'Pari' || category === 'Satellite'
      ? category
      : 'Satellite';
  };

  const fetchStockData = async (symbol: string): Promise<StockData | null> => {
    if (!symbol) return null;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/quote?symbol=${symbol}`);
      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des données du titre');
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      console.error('Error fetching stock info:', err);
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la récupération des données du titre'
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!formData.symbol) return;
    const data = await fetchStockData(formData.symbol);
    if (data) {
      setStockInfo(data);
      // Mettre à jour le prix actuel si c'est une nouvelle entrée et que le prix n'est pas déjà défini
      if (!initialData && data.price) {
        setFormData((prev) => ({
          ...prev,
          price: data.price.toString(),
        }));
      }
    } else {
      setStockInfo(null);
    }
  };

  // Initial load effect
  useEffect(() => {
    if (initialData) {
      setFormData({
        symbol: initialData.symbol,
        qty: initialData.shares.toString(),
        price: initialData.buyPrice.toString(),
        category: initialData.category,
        target: initialData.targetPercent?.toString() || '',
      });

      // Fetch stock info for the initial data
      // For editing, we might want to fetch to get latest price/logo, but maybe not block interaction?
      // Keeping it auto-fetch on open for edit is usually fine/expected to verify current stats.
      fetchStockData(initialData.symbol).then((data) => setStockInfo(data));
    } else {
      setFormData(DEFAULT_FORM_DATA);
      setStockInfo(null);
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'symbol') {
      const upperValue = value.toUpperCase();
      setFormData((prev) => ({
        ...prev,
        [name]: upperValue,
      }));

      // Reset stock info if symbol changes significantly to avoid mismatch
      if (stockInfo && upperValue !== stockInfo.symbol) {
        setStockInfo(null);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.symbol || !formData.qty || !formData.price) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (existingSymbols.includes(formData.symbol) && !initialData) {
      setError('Ce titre est déjà dans votre portefeuille');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure we have stock data either from manual search or fetch now
      let currentStockInfo = stockInfo;
      if (!currentStockInfo || currentStockInfo.symbol !== formData.symbol) {
        currentStockInfo = await fetchStockData(formData.symbol);
      }

      // Build stockData
      const stockData = {
        // Include id for updates
        id: initialData?.id,
        symbol: formData.symbol,
        name: currentStockInfo?.name || formData.symbol, // Use fetched name or fall back to symbol
        // Use qty/price/target naming expected by handleAddStock
        qty: formData.qty,
        price: formData.price,
        target: formData.target,
        // Also include shares/buyPrice for compatibility
        shares: parseFloat(formData.qty),
        buyPrice: parseFloat(formData.price),
        currentPrice: currentStockInfo?.price || parseFloat(formData.price),
        targetPercent: formData.target ? parseFloat(formData.target) : undefined,
        beta: currentStockInfo?.beta,
        sector: currentStockInfo?.sector,
        industry: currentStockInfo?.industry,
        category: getValidCategory(formData.category),
        logo: currentStockInfo?.image,
        created_at: new Date().toISOString(),
      };

      await onAdd(stockData);
      onClose();
    } catch (err) {
      console.error('Error adding stock:', err);
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue lors de l'ajout du titre"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Modifier le titre' : 'Ajouter un titre'}</h2>
          <button className="close-btn" onClick={onClose} disabled={loading} aria-label="Fermer">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="symbol">Symbole *</label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              placeholder="Ex: AAPL"
              required
              disabled={!!initialData || loading}
              autoComplete="off"
            />
            {stockInfo && (
              <div className="stock-info-preview">
                <span className="stock-name">{stockInfo.name}</span>
                <span className="stock-price">
                  {stockInfo.price?.toFixed(2)} $
                  {stockInfo.change !== undefined && (
                    <span
                      className={`price-change ${stockInfo.change >= 0 ? 'positive' : 'negative'}`}
                    >
                      {stockInfo.change >= 0 ? '↑' : '↓'} {Math.abs(stockInfo.change).toFixed(2)}(
                      {stockInfo.changePercent?.toFixed(2)}%)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="qty">Quantité *</label>
              <input
                type="number"
                id="qty"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                placeholder="0"
                min="0.0001"
                step="any"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">{"Prix d'achat *"}</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                min="0.0001"
                step="0.0001"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Catégorie</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="Pilier">Pilier</option>
                <option value="Satellite">Satellite</option>
                <option value="Pari">Pari</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="target">{"Cible d'allocation (%)"}</label>
              <input
                type="number"
                id="target"
                name="target"
                value={formData.target}
                onChange={handleChange}
                placeholder="Optionnel"
                min="0"
                max="100"
                step="0.01"
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !formData.symbol || !formData.qty || !formData.price}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {initialData ? 'Mise à jour...' : 'Ajout en cours...'}
                </>
              ) : initialData ? (
                'Mettre à jour'
              ) : (
                'Ajouter au portefeuille'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;

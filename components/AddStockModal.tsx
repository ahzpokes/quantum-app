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
    return category === 'Core' || category === 'Opportunity' || category === 'Satellite'
      ? category
      : 'Satellite';
  };

  const fetchStockInfo = useCallback(
    async (symbol: string) => {
      if (!symbol) {
        setStockInfo(null);
        return;
      }

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

        setStockInfo(data);

        // Mettre à jour le prix actuel si c'est une nouvelle entrée
        if (!initialData && data.price) {
          setFormData((prev) => ({
            ...prev,
            price: data.price.toString(),
          }));
        }
      } catch (err) {
        console.error('Error fetching stock info:', err);
        setError(
          err instanceof Error ? err.message : 'Erreur lors de la récupération des données du titre'
        );
        setStockInfo(null);
      } finally {
        setLoading(false);
      }
    },
    [initialData]
  );

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
      fetchStockInfo(initialData.symbol);
    } else {
      setFormData(DEFAULT_FORM_DATA);
      setStockInfo(null);
    }
  }, [initialData, isOpen, fetchStockInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'symbol') {
      // Mettre à jour le symbole en majuscules
      const upperValue = value.toUpperCase();
      setFormData((prev) => ({
        ...prev,
        [name]: upperValue,
      }));

      // Si le symbole change, récupérer les informations du titre
      if (upperValue.length >= 1 && upperValue !== formData.symbol) {
        fetchStockInfo(upperValue);
      } else if (upperValue === '') {
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
      // Build stockData with fields expected by handleAddStock in portefeuille/page.js
      const stockData = {
        // Include id for updates
        id: initialData?.id,
        symbol: formData.symbol,
        name: stockInfo?.name || formData.symbol,
        // Use qty/price/target naming expected by handleAddStock
        qty: formData.qty,
        price: formData.price,
        target: formData.target,
        // Also include shares/buyPrice for compatibility
        shares: parseFloat(formData.qty),
        buyPrice: parseFloat(formData.price),
        currentPrice: stockInfo?.price || parseFloat(formData.price),
        targetPercent: formData.target ? parseFloat(formData.target) : undefined,
        beta: stockInfo?.beta,
        sector: stockInfo?.sector,
        industry: stockInfo?.industry,
        category: getValidCategory(formData.category),
        logo: stockInfo?.image,
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
                <option value="Core">Core</option>
                <option value="Satellite">Satellite</option>
                <option value="Opportunity">Opportunité</option>
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

import yfinance as yf
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from supabase import create_client, Client
import os

# --- CONFIG ---
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# --- PARAMÈTRES OFFENSIFS ---
# Plancher de volatilité : Si une action a moins de 25% de vol, on la traite comme si elle avait 25%.
# Effet : Réduit l'allocation des titres défensifs (LMT, HON) pour redistribuer vers la Tech.
VOL_FLOOR = 0.25  

# Seuil Momentum : Si Prix < MM200 * 0.95 (soit 5% sous la MM200), on réduit son poids cible.
MOMENTUM_PENALTY_FACTOR = 0.5  # On coupe l'allocation cible en deux si tendance baissière

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Les variables d'environnement SUPABASE_URL et SUPABASE_KEY sont manquantes.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def apply_momentum_filter(weights, prices_df):
    """
    Ajuste les poids finaux en fonction de la tendance (MM200).
    Si une action est en chute libre, on réduit son allocation.
    """
    last_prices = prices_df.iloc[-1]
    sma_200 = prices_df.rolling(window=200).mean().iloc[-1]
    
    # Ratio Prix / MM200
    mom_ratios = last_prices / sma_200
    
    adjusted_weights = weights.copy()
    
    for ticker, ratio in mom_ratios.items():
        # Si le prix est > 5% sous la MM200, on applique la pénalité
        if ratio < 0.95:
            original = adjusted_weights[ticker]
            penalty = original * MOMENTUM_PENALTY_FACTOR
            adjusted_weights[ticker] = penalty
            print(f"⚠️ MOMENTUM ALERT: {ticker} est en tendance baissière (Ratio: {ratio:.2f}). Poids réduit de {original:.1%} -> {penalty:.1%}")
            
    # Re-normalisation pour que la somme fasse 100%
    return adjusted_weights / adjusted_weights.sum()

def get_aggressive_risk_parity_weights(prices_df):
    """
    Calcule les poids ERC mais avec un 'Volatility Floor' artificiel dans la matrice de covariance.
    """
    returns = prices_df.pct_change().dropna()
    
    # 1. Calcul de la volatilité réelle
    real_vol = returns.std() * np.sqrt(252)
    
    # 2. Application du Volatility Floor
    # On crée un facteur d'ajustement pour "gonfler" la volatilité des titres trop calmes
    # Si vol réelle = 15% et floor = 25%, le facteur est 25/15 = 1.66
    adj_factors = np.maximum(real_vol, VOL_FLOOR) / real_vol
    
    # On ajuste les rendements pour simuler une volatilité plus élevée
    # Cela va tromper l'optimiseur Scipy pour qu'il donne moins de poids à ces titres
    adjusted_returns = returns * adj_factors
    
    # 3. Matrice de covariance ajustée
    cov_matrix = adjusted_returns.cov() * 252

    num_assets = len(prices_df.columns)
    x0 = np.ones(num_assets) / num_assets

    def objective(weights, cov):
        portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov, weights)))
        mrc = np.dot(cov, weights) / portfolio_vol
        rc = weights * mrc
        target = portfolio_vol / num_assets
        return np.sum((rc - target)**2)

    cons = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'ineq', 'fun': lambda x: x})

    res = minimize(objective, x0, args=(cov_matrix), method='SLSQP', constraints=cons, tol=1e-10)
    
    base_weights = pd.Series(res.x, index=prices_df.columns)
    
    # 4. Application du filtre Momentum APRES l'optimisation mathématique
    final_weights = apply_momentum_filter(base_weights, prices_df)
    
    return final_weights

def main():
    print(f"🚀 Démarrage Risk Parity AGGRESSIVE (Floor: {VOL_FLOOR:.0%})...")

    # 1. Récupérer les tickers
    response = supabase.table('positions').select("id, symbol").execute()
    db_positions = response.data
    
    if not db_positions:
        print("❌ Pas d'actions dans la base.")
        return

    ticker_to_id = {p['symbol']: p['id'] for p in db_positions}
    tickers = list(ticker_to_id.keys())
    
    print(f"📥 Téléchargement historique (1 an) pour {len(tickers)} actions...")

    # 2. Téléchargement YFinance
    data = yf.download(tickers, period="1y", interval="1d", auto_adjust=False)['Adj Close']
    
    # Nettoyage robuste
    if isinstance(data, pd.Series): # Si une seule action
        data = data.to_frame()
        
    data = data.dropna(axis=1, how='all')
    data = data.ffill().bfill()
    
    final_tickers = data.columns.tolist()
    if not final_tickers:
        print("❌ Erreur : Aucune donnée.")
        return

    # 3. Calcul
    print("🧮 Optimisation avec contraintes offensives...")
    try:
        optimal_weights = get_aggressive_risk_parity_weights(data)
    except Exception as e:
        print(f"❌ Erreur optimisation : {e}")
        return

    print("\n🏆 NOUVELLES CIBLES (Aggressive) :")
    print(optimal_weights.sort_values(ascending=False).map(lambda x: f"{x:.2%}"))

    # 4. Mise à jour Supabase
    print("\n💾 Mise à jour Supabase...")
    for ticker, weight in optimal_weights.items():
        pos_id = ticker_to_id.get(ticker)
        if pos_id:
            target_val = float(weight * 100)
            supabase.table('positions').update({
                'risk_parity_target': target_val
            }).eq('id', pos_id).execute()

    print("✨ Terminé.")

if __name__ == "__main__":
    main()

import yfinance as yf
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from supabase import create_client, Client

import os

# --- CONFIG ---
# Les clés doivent être définies dans les Secrets GitHub
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Les variables d'environnement SUPABASE_URL et SUPABASE_KEY sont manquantes.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_true_risk_parity_weights(prices_df):
    """
    Calcule les poids ERC (Equal Risk Contribution) en utilisant
    la matrice de covariance et l'optimisation SLSQP.
    """
    returns = prices_df.pct_change().dropna()
    cov_matrix = returns.cov() * 252 # Annualisation
    num_assets = len(prices_df.columns)
    
    # Poids initiaux (1/N)
    x0 = np.ones(num_assets) / num_assets
    
    # Fonction à minimiser
    def objective(weights, cov):
        portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov, weights)))
        mrc = np.dot(cov, weights) / portfolio_vol # Marginal Risk Contribution
        rc = weights * mrc # Risk Contribution
        target = portfolio_vol / num_assets
        return np.sum((rc - target)**2)

    # Contraintes : Somme = 1, Poids >= 0
    cons = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'ineq', 'fun': lambda x: x})

    res = minimize(objective, x0, args=(cov_matrix), method='SLSQP', constraints=cons, tol=1e-10)
    
    return pd.Series(res.x, index=prices_df.columns)

def main():
    print("🚀 Démarrage de l'analyse Risk Parity Pro...")

    # 1. Récupérer les tickers depuis Supabase
    response = supabase.table('positions').select("id, symbol").execute()
    db_positions = response.data
    
    if not db_positions:
        print("❌ Pas d'actions dans la base.")
        return

    # Création d'un dico pour retrouver l'ID plus tard { 'AAPL': 12, ... }
    ticker_to_id = {p['symbol']: p['id'] for p in db_positions}
    tickers = list(ticker_to_id.keys())
    
    print(f"📥 Téléchargement historique (1 an) pour {len(tickers)} actions...")
    
    # 2. Téléchargement YFinance
    # On télécharge tout le bloc. 'Adj Close' gère dividendes/splits.
    data = yf.download(tickers, period="1y", interval="1d")['Adj Close']
    
    # Nettoyage si données manquantes (ex: IPO récente < 1 an)
    data = data.dropna(axis=1, how='all') # Vire les colonnes vides
    data = data.fillna(method='ffill').fillna(method='bfill') # Bouche les trous
    
    final_tickers = data.columns.tolist()
    print(f"✅ Données prêtes pour : {', '.join(final_tickers)}")

    # 3. Calcul Mathématique
    print("🧮 Optimisation de la Covariance en cours...")
    optimal_weights = get_true_risk_parity_weights(data)
    
    print("\n🏆 RÉSULTATS RISK PARITY :")
    print(optimal_weights.sort_values(ascending=False).map(lambda x: f"{x:.2%}"))

    # 4. Envoi vers Supabase
    print("\n💾 Mise à jour de la base de données...")
    for ticker, weight in optimal_weights.items():
        pos_id = ticker_to_id.get(ticker)
        if pos_id:
            target_val = float(weight * 100) # En format 12.5
            
            supabase.table('positions').update({
                'risk_parity_target': target_val
            }).eq('id', pos_id).execute()
            
    print("✨ Terminé ! Ton dashboard est à jour.")

if __name__ == "__main__":
    main()

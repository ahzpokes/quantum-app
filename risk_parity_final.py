import yfinance as yf
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from supabase import create_client, Client
import os
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Variables d'environnement Supabase manquantes")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# PARAMÈTRES RISK PARITY
# ==========================================

# Plancher de volatilité : si une action a < 25% de vol, on la traite comme si elle avait 25%
# Cela réduit l'allocation aux titres trop "mous" et répartit vers la croissance
VOL_FLOOR = 0.25

# Facteur de pénalité momentum : si un titre est en baisse (ratio < 0.95), on réduit son poids de 50%
MOMENTUM_PENALTY_FACTOR = 0.5

# Seuil de momentum : ratio < 0.95 = sous la MM200 journalière = baisse
MOMENTUM_THRESHOLD = 0.95

# ==========================================
# FONCTIONS UTILITAIRES
# ==========================================

def get_fundamental_metrics(ticker):
    """
    Récupère PE, Growth, Rendement attendu pour un ticker.
    INFORMATIONNEL uniquement (pas de rejet basé sur ces métriques).
    """
    try:
        info = yf.Ticker(ticker).info
        
        pe = info.get('forwardPE') or info.get('trailingPE') or 0
        growth = info.get('earningsGrowth') or 0.10
        div_yield = info.get('dividendYield') or 0
        
        # Calcul PEG pour information
        peg = (pe / (growth * 100)) if pe > 0 and growth > 0 else None
        
        return {
            'PE': pe,
            'Growth': growth,
            'PEG': peg,
            'Div_Yield': div_yield
        }
    except Exception as e:
        print(f"⚠️  {ticker}: Erreur récupération métriques ({e})")
        return None

def calculate_volatility(prices_df, ticker):
    """Calcule la volatilité annualisée à partir des données de prix."""
    try:
        returns = prices_df[ticker].pct_change().dropna()
        vol = returns.std() * np.sqrt(252)  # 252 jours de bourse
        return vol if vol > 0 else 0.01  # Avoid zero
    except:
        return 0.01

def calculate_momentum(prices_df, ticker):
    """
    Calcule le ratio Prix Actuel / MM200 journalière.
    Ratio > 0.95 = Haussier
    Ratio < 0.95 = Baissier
    """
    try:
        if len(prices_df[ticker]) < 200:
            return 1.0  # Pas assez de données, assume neutre
        
        ma200 = prices_df[ticker].rolling(window=200).mean().iloc[-1]
        current_price = prices_df[ticker].iloc[-1]
        
        if pd.isna(ma200) or ma200 == 0:
            return 1.0
        
        ratio = current_price / ma200
        return ratio
    except Exception as e:
        print(f"⚠️  {ticker}: Erreur calcul momentum ({e})")
        return 1.0

def get_correlation(ticker_i, ticker_j):
    """Matrice de corrélation pré-définie basée sur les secteurs."""
    if ticker_i == ticker_j:
        return 1.0
    
    tech_group = ['GOOGL', 'AMZN', 'TTD', 'PATH']
    fin_group = ['MA', 'SPGI']
    health_group = ['UNH', 'NVO']
    def_group = ['LMT', 'HON']
    
    if (ticker_i in tech_group and ticker_j in tech_group):
        return 0.65
    elif (ticker_i in fin_group and ticker_j in fin_group):
        return 0.70
    elif (ticker_i in health_group and ticker_j in health_group):
        return 0.55
    elif (ticker_i in def_group and ticker_j in def_group):
        return 0.60
    else:
        return 0.35

def get_price_history(tickers, years=1):
    """Récupère les données historiques de prix via yfinance."""
    try:
        from datetime import datetime, timedelta
        start_date = (datetime.now() - timedelta(days=years*365)).strftime('%Y-%m-%d')
        
        print(f"📥 Téléchargement données depuis {start_date}...")
        data = yf.download(tickers, start=start_date, progress=False)['Adj Close']
        
        if isinstance(data, pd.Series):
            data = data.to_frame()
        
        data = data.dropna(axis=1, how='all').ffill().bfill()
        
        return data
    except Exception as e:
        print(f"❌ Erreur téléchargement prix: {e}")
        return None

def apply_momentum_filter(weights, prices_df):
    """
    Applique le filtre momentum.
    Si un titre est sous sa MM200 (ratio < 0.95), réduit son poids de 50%.
    """
    adjusted_weights = weights.copy()
    
    print(f"\n⚙️  Filtre Momentum (Seuil: {MOMENTUM_THRESHOLD}):")
    
    for ticker in adjusted_weights.index:
        if ticker in prices_df.columns:
            ratio = calculate_momentum(prices_df, ticker)
            
            if ratio < MOMENTUM_THRESHOLD:
                original = adjusted_weights[ticker]
                penalty = original * MOMENTUM_PENALTY_FACTOR
                adjusted_weights[ticker] = penalty
                reduction = (original - penalty) / original * 100
                print(f"  ⚠️  {ticker:6} Ratio {ratio:.2f} | {original*100:5.2f}% → {penalty*100:5.2f}% (-{reduction:.0f}%)")
    
    # Re-normalise
    adjusted_weights = adjusted_weights / adjusted_weights.sum()
    return adjusted_weights

def optimize_risk_parity(prices_df, tickers):
    """
    Optimise les poids pour Risk Parity avec contrainte de Volatility Floor.
    
    Processus:
    1. Calcule les volatilités réelles
    2. Applique le floor (min 25%)
    3. Crée matrice covariance ajustée
    4. Optimise pour égaliser contribution au risque
    5. Applique filtre momentum
    """
    
    # 1. Calcul volatilités
    print(f"\n📊 Calcul volatilités (1 an):")
    vols = {}
    for ticker in tickers:
        vol = calculate_volatility(prices_df, ticker)
        vols[ticker] = vol
        print(f"  {ticker}: {vol:.1%}")
    
    # 2. Calcul corrélations et covariance
    correl_matrix = pd.DataFrame(index=tickers, columns=tickers)
    for i in tickers:
        for j in tickers:
            correl_matrix.loc[i, j] = get_correlation(i, j)
    
    # 3. Appliquer volatility floor
    adjusted_vols = np.array([max(vols[t], VOL_FLOOR) for t in tickers])
    
    # 4. Matrice de covariance ajustée
    cov_matrix = pd.DataFrame(index=tickers, columns=tickers)
    for i in tickers:
        for j in tickers:
            idx_i = list(tickers).index(i)
            idx_j = list(tickers).index(j)
            cov_matrix.loc[i, j] = adjusted_vols[idx_i] * adjusted_vols[idx_j] * correl_matrix.loc[i, j]
    
    cov_mat_np = cov_matrix.values.astype(float)
    
    # 5. Optimisation Risk Parity
    print(f"\n🧮 Optimisation Risk Parity (Floor vol: {VOL_FLOOR:.0%})...")
    
    num_assets = len(tickers)
    x0 = np.ones(num_assets) / num_assets
    
    def objective(weights, cov):
        portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov, weights)))
        if portfolio_vol == 0:
            return 1e10
        mrc = np.dot(cov, weights) / portfolio_vol
        rc = weights * mrc
        target = portfolio_vol / num_assets
        return np.sum((rc - target)**2)
    
    cons = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'ineq', 'fun': lambda x: x})
    
    res = minimize(objective, x0, args=(cov_mat_np), method='SLSQP', constraints=cons, tol=1e-10)
    
    if not res.success:
        print(f"⚠️  Optimisation convergence issue: {res.message}")
    
    base_weights = pd.Series(res.x, index=tickers)
    
    # 6. Appliquer momentum filter
    final_weights = apply_momentum_filter(base_weights, prices_df)
    
    return final_weights, vols

def main():
    """Main pipeline: Découverte + Risk Parity + Sauvegarde Supabase."""
    
    print("=" * 100)
    print("🚀 PIPELINE RISK PARITY - DISCOVERY MODE")
    print("=" * 100)
    
    # 1. Récupérer les tickers depuis Supabase
    print("\n1️⃣  ÉTAPE 1 : Récupération des positions depuis Supabase")
    print("-" * 100)
    
    try:
        response = supabase.table('positions').select("id, symbol").execute()
        db_positions = response.data
        
        if not db_positions:
            print("❌ Aucune position trouvée dans Supabase")
            return
        
        ticker_to_id = {p['symbol']: p['id'] for p in db_positions}
        tickers = list(ticker_to_id.keys())
        
        print(f"✅ {len(tickers)} positions trouvées: {', '.join(tickers)}")
    except Exception as e:
        print(f"❌ Erreur Supabase: {e}")
        return
    
    # 2. Récupérer les métriques fondamentales (informatif)
    print("\n2️⃣  ÉTAPE 2 : Récupération des métriques fondamentales")
    print("-" * 100)
    
    fundamental_data = {}
    for ticker in tickers:
        metrics = get_fundamental_metrics(ticker)
        if metrics:
            fundamental_data[ticker] = metrics
            peg_str = f"PEG {metrics['PEG']:.2f}" if metrics['PEG'] else "PEG N/A"
            print(f"  {ticker}: PE={metrics['PE']:.1f} | Growth={metrics['Growth']:.0%} | {peg_str}")
    
    # 3. Télécharger les données historiques
    print("\n3️⃣  ÉTAPE 3 : Téléchargement des données historiques (1 an)")
    print("-" * 100)
    
    prices_df = get_price_history(tickers, years=1)
    if prices_df is None or prices_df.empty:
        print("❌ Impossible de récupérer les données de prix")
        return
    
    final_tickers = [t for t in tickers if t in prices_df.columns]
    if len(final_tickers) < len(tickers):
        print(f"⚠️  Seulement {len(final_tickers)}/{len(tickers)} tickers avec données")
        tickers = final_tickers
    
    # 4. Optimisation Risk Parity
    print("\n4️⃣  ÉTAPE 4 : Optimisation Risk Parity + Momentum")
    print("-" * 100)
    
    try:
        optimal_weights, volatilities_dict = optimize_risk_parity(prices_df, tickers)
    except Exception as e:
        print(f"❌ Erreur optimisation: {e}")
        return
    
    # 5. Afficher les résultats
    print("\n5️⃣  ÉTAPE 5 : Résultats Finaux")
    print("-" * 100)
    
    results_df = pd.DataFrame({
        'Ticker': optimal_weights.index,
        'Allocation %': (optimal_weights.values * 100).round(1),
        'Volatilité': [f"{volatilities_dict[t]:.1%}" for t in optimal_weights.index],
    })
    
    results_df = results_df.sort_values('Allocation %', ascending=False).reset_index(drop=True)
    print("\n" + results_df.to_string(index=False))
    print(f"\n✅ Total: {optimal_weights.sum():.0%}")
    
    # 6. Sauvegarde dans Supabase
    print("\n6️⃣  ÉTAPE 6 : Sauvegarde dans Supabase")
    print("-" * 100)
    
    try:
        for ticker, weight in optimal_weights.items():
            if ticker in ticker_to_id:
                pos_id = ticker_to_id[ticker]
                metrics = fundamental_data.get(ticker, {})
                momentum = calculate_momentum(prices_df, ticker)
                
                supabase.table('positions').update({
                    'risk_parity_target': float(weight * 100),
                    'momentum_ratio': float(momentum),
                    'pe_ratio': float(metrics.get('PE', 0)),
                    'growth_est': float(metrics.get('Growth', 0)),
                    'updated_at': datetime.now().isoformat()
                }).eq('id', pos_id).execute()
        
        print(f"✅ {len(optimal_weights)} positions mises à jour dans Supabase")
    except Exception as e:
        print(f"❌ Erreur sauvegarde Supabase: {e}")
        return
    
    print("\n" + "=" * 100)
    print("✨ Pipeline terminé avec succès!")
    print("=" * 100)

if __name__ == "__main__":
    main()

import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const quote = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryDetail',
        'defaultKeyStatistics',
        'summaryProfile',
        'earnings',
        'recommendationTrend',
        'earningsHistory',
        'financialData',
      ],
    });

    const price = quote.price || {};
    const summary = quote.summaryDetail || {};
    const stats = quote.defaultKeyStatistics || {};
    const profile = quote.summaryProfile || {};
    const earnings = quote.earnings || {};
    const earningsHistory = quote.earningsHistory?.history || [];
    const recommendations = quote.recommendationTrend || {};

    // Map earnings history to the format expected by the UI (actual vs estimate)
    const formattedEarnings = earningsHistory.map((e) => ({
      actual: e.epsActual,
      estimate: e.epsEstimate,
      quarter: e.quarter,
    }));

    // Calculate PEG if missing: PEG = PE / (Earnings Growth Rate * 100)
    // We use earningsGrowth from financialData (which is e.g. 0.12 for 12%)
    const earningsGrowth = quote.financialData?.earningsGrowth;
    let calculatedPeg = stats.pegRatio;

    if (!calculatedPeg && summary.trailingPE && earningsGrowth) {
      // PEG = PE / (Growth * 100)
      // Example: PE 30, Growth 0.15 (15%) -> 30 / 15 = 2.0
      calculatedPeg = summary.trailingPE / (earningsGrowth * 100);
    }

    // Helper to get logo from website
    let logoUrl = '';
    if (profile.website) {
      try {
        const hostname = new URL(profile.website).hostname;
        logoUrl = `https://logo.clearbit.com/${hostname}`;
      } catch (e) {
        // ignore invalid urls
      }
    }

    const data = {
      symbol: symbol.toUpperCase(),
      name: price.longName || price.shortName,
      currency: price.currency,
      currentPrice: price.regularMarketPrice,
      marketCap: price.marketCap,
      high52w: summary.fiftyTwoWeekHigh,
      low52w: summary.fiftyTwoWeekLow,
      peTrailing: summary.trailingPE,
      peForward: summary.forwardPE,
      pegRatio: calculatedPeg,
      beta: summary.beta,
      dividendYield: (summary.dividendYield || 0) * 100,
      sector: profile.sector,
      industry: profile.industry,
      description: profile.longBusinessSummary,
      image: logoUrl, // Add logo URL here
      earnings:
        formattedEarnings.length > 0
          ? formattedEarnings
          : earnings.financialsChart?.quarterly || [],
      recommendations: recommendations.trend?.[0] || {},
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error(`Error fetching quote for ${symbol}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get all positions
    const { data: positions, error } = await supabase.from('positions').select('id, symbol');
    if (error) throw error;

    const results = [];

    // Parallelize calls
    await Promise.all(
      positions.map(async (pos) => {
        try {
          // 2. Fetch data from Yahoo Finance
          const quote = await yahooFinance.quoteSummary(pos.symbol, {
            modules: [
              'price',
              'summaryDetail',
              'defaultKeyStatistics',
              'summaryProfile',
              'financialData',
            ],
          });

          const price = quote.price || {};
          const summary = quote.summaryDetail || {};
          const stats = quote.defaultKeyStatistics || {};
          const profile = quote.summaryProfile || {};
          const financial = quote.financialData || {};

          // Calculate PEG if missing
          let calculatedPeg = stats.pegRatio;
          if (!calculatedPeg && summary.trailingPE && financial.earningsGrowth) {
            calculatedPeg = summary.trailingPE / (financial.earningsGrowth * 100);
          }

          // 3. Prepare updates
          const updates = {
            name: price.longName || price.shortName,
            sector: profile.sector || 'Autre',
            industry: profile.industry || '',
            market_cap: price.marketCap || 0,
            current_price: price.regularMarketPrice || 0,
            pe_ratio: summary.trailingPE || 0,
            pe_forward: summary.forwardPE || 0,
            peg_ratio: calculatedPeg || 0,
            beta: summary.beta || 1.0,
            dividend_yield: (summary.dividendYield || 0) * 100,
            high_52w: summary.fiftyTwoWeekHigh || 0,
            low_52w: summary.fiftyTwoWeekLow || 0,
            description: (profile.longBusinessSummary || '').substring(0, 5000),
          };

          // 4. Update Supabase
          const { error: updateError } = await supabase
            .from('positions')
            .update(updates)
            .eq('id', pos.id);

          if (updateError) throw updateError;

          results.push({ symbol: pos.symbol, status: 'updated', updates });
        } catch (err) {
          console.error(`Error updating ${pos.symbol}:`, err);
          results.push({ symbol: pos.symbol, status: 'error', error: err.message });
        }
      })
    );

    return NextResponse.json({ message: 'Update complete', results });
  } catch (err) {
    console.error('Global error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function POST(request) {
  try {
    const { positions } = await request.json(); // positions: [{ symbol, shares, created_at, buyPrice }]

    if (!positions || positions.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const endDate = new Date();

    // Find the earliest creation date to start the history
    let earliestDate = new Date();
    positions.forEach((p) => {
      if (p.created_at) {
        const cDate = new Date(p.created_at);
        if (cDate < earliestDate) earliestDate = cDate;
      }
    });

    // Default to 1 month back if earliest date is today (e.g. just added stocks)
    if (new Date() - earliestDate < 86400000) {
      // less than 24h
      earliestDate.setMonth(earliestDate.getMonth() - 1);
    }

    // Fetch history for each symbol
    const historyPromises = positions.map(async (pos) => {
      try {
        const resultObj = await yahooFinance.chart(pos.symbol, {
          period1: earliestDate,
          period2: endDate,
          interval: '1d',
        });
        const result = resultObj.quotes;
        return {
          symbol: pos.symbol,
          shares: pos.shares,
          created_at: pos.created_at,
          buyPrice: pos.buyPrice,
          data: result,
        };
      } catch (error) {
        console.error(`Error fetching history for ${pos.symbol}`, error);
        return {
          symbol: pos.symbol,
          shares: pos.shares,
          created_at: pos.created_at,
          buyPrice: pos.buyPrice,
          data: [],
        };
      }
    });

    const results = await Promise.all(historyPromises);

    // Get all unique dates
    const allDates = new Set();
    results.forEach((r) => {
      r.data.forEach((day) => {
        if (day.date) {
          allDates.add(day.date.toISOString().split('T')[0]);
        }
      });
    });

    const sortedDates = Array.from(allDates).sort();

    // Map symbol -> date -> closePrice
    const priceMaps = {};
    results.forEach((r) => {
      const map = {};
      r.data.forEach((day) => {
        if (day.date && day.close) {
          map[day.date.toISOString().split('T')[0]] = day.close;
        }
      });
      priceMaps[r.symbol] = map;
    });

    const history = [];
    const lastKnownPrices = {};

    for (const date of sortedDates) {
      let dailyValue = 0;
      let dailyInvested = 0;
      const currentDateObj = new Date(date);

      positions.forEach((pos) => {
        const price = priceMaps[pos.symbol]?.[date];
        if (price !== undefined) {
          lastKnownPrices[pos.symbol] = price;
        }

        // Check if position existed on this date
        // If created_at is missing, assume it always existed (fallback)
        // Using setHours(0,0,0,0) for comparison to avoid time issues
        const createdAt = pos.created_at ? new Date(pos.created_at) : new Date(0);

        // Only include if the date is ON or AFTER the creation date
        // We compare strings or timestamps.
        // date is YYYY-MM-DD string. createdAt is Date object.
        if (currentDateObj >= createdAt || date === createdAt.toISOString().split('T')[0]) {
          if (lastKnownPrices[pos.symbol]) {
            dailyValue += lastKnownPrices[pos.symbol] * Number(pos.shares);
            dailyInvested += Number(pos.buyPrice) * Number(pos.shares);
          }
        }
      });

      // Push if we have a value.
      // We might have 0 value if we are before the first stock was bought (though start date logic tries to prevent this)
      if (dailyValue > 0 || dailyInvested > 0) {
        history.push({ date, value: dailyValue, invested: dailyInvested });
      }
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Portfolio history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

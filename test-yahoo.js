const YahooFinance = require('yahoo-finance2').default;

async function test() {
  try {
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    // Fetch financialData specifically
    const quote = await yahooFinance.quoteSummary('AAPL', {
      modules: ['financialData', 'defaultKeyStatistics'],
    });

    console.log('--- FINANCIAL DATA ---');
    console.log('financialData.pegRatio:', quote.financialData?.pegRatio);
    console.log('defaultKeyStatistics.pegRatio:', quote.defaultKeyStatistics?.pegRatio);

    // Let's print the whole financialData object to see what's there
    console.log('\n--- FULL FINANCIAL DATA ---');
    console.log(JSON.stringify(quote.financialData, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();

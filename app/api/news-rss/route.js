import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

export async function POST(request) {
  try {
    const { stocks } = await request.json();
    console.log('RSS API called with stocks:', stocks);

    if (!stocks || stocks.length === 0) {
      return NextResponse.json({ news: [] });
    }

    let allNews = [];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Fetch Yahoo Finance RSS for each ticker in parallel
    await Promise.all(
      stocks.map(async (stock) => {
        try {
          const rssUrl = `https://finance.yahoo.com/rss/headline?s=${stock.symbol}`;
          console.log(`Fetching RSS for ${stock.symbol}:`, rssUrl);

          const feed = await parser.parseURL(rssUrl);
          console.log(`Feed parsed for ${stock.symbol}, items count:`, feed?.items?.length || 0);

          if (feed && feed.items) {
            feed.items.forEach((item, index) => {
              const pubDate = new Date(item.pubDate);

              // Log first item structure to debug
              if (index === 0) {
                console.log(
                  `First item structure for ${stock.symbol}:`,
                  JSON.stringify(item, null, 2)
                );
              }

              // Filter to last 3 months
              if (pubDate >= threeMonthsAgo) {
                // Extract image from enclosure or media content
                let imageUrl = null;
                if (item.enclosure && item.enclosure.url) {
                  imageUrl = item.enclosure.url;
                  console.log(`Found image via enclosure for ${stock.symbol}:`, imageUrl);
                } else if (
                  item['media:thumbnail'] &&
                  item['media:thumbnail']['$'] &&
                  item['media:thumbnail']['$'].url
                ) {
                  imageUrl = item['media:thumbnail']['$'].url;
                  console.log(`Found image via media:thumbnail for ${stock.symbol}:`, imageUrl);
                } else if (
                  item['media:content'] &&
                  item['media:content']['$'] &&
                  item['media:content']['$'].url
                ) {
                  imageUrl = item['media:content']['$'].url;
                  console.log(`Found image via media:content for ${stock.symbol}:`, imageUrl);
                }

                // Categorize news: earnings vs general
                const title = item.title.toLowerCase();
                const earningsKeywords = [
                  'earnings',
                  'results',
                  'quarter',
                  'q1',
                  'q2',
                  'q3',
                  'q4',
                  'revenue',
                  'eps',
                  'profit',
                  'loss',
                  'sales',
                ];
                const isEarnings = earningsKeywords.some((keyword) => title.includes(keyword));

                allNews.push({
                  title: item.title,
                  link: item.link,
                  pubDate: item.pubDate,
                  isoDate: item.isoDate,
                  contentSnippet: item.contentSnippet || item.content?.substring(0, 200) || '',
                  source: 'Yahoo Finance',
                  symbol: stock.symbol,
                  image: imageUrl,
                  category: isEarnings ? 'earnings' : 'general',
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching RSS for ${stock.symbol}:`, error.message);
          // Continue with next stock
        }
      })
    );

    // Deduplicate by link
    const uniqueNews = Array.from(new Map(allNews.map((item) => [item.link, item])).values());

    // Sort by date desc
    uniqueNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    console.log('After filtering, returning news count:', uniqueNews.length);
    return NextResponse.json({ news: uniqueNews });
  } catch (error) {
    console.error('RSS news error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

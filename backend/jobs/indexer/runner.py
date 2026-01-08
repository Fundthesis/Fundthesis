"""Indexer Job Runner - Embeds and indexes articles for RAG.

This job:
1. Fetches articles that don't have embeddings yet
2. Generates embeddings using Cohere Embed-v4
3. Stores embeddings in PostgreSQL pgvector

Run with: python -m jobs.indexer.runner
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
load_dotenv()

from app.core.database import db
from rag.embeddings import get_embed_service
from rag.vector_search import VectorSearchService


async def index_articles(batch_size: int = 50, max_articles: int = 500):
    """
    Index articles that don't have embeddings yet.
    
    Args:
        batch_size: Number of articles to process at once
        max_articles: Maximum total articles to process in one run
    """
    embed_service = get_embed_service()
    vector_service = VectorSearchService()
    
    # Connect to database
    if not db.is_connected():
        await db.connect()
    
    await vector_service.connect()
    
    try:
        total_indexed = 0
        
        while total_indexed < max_articles:
            # Get articles without embeddings
            articles = await vector_service.get_articles_without_embeddings(limit=batch_size)
            
            if not articles:
                print("No more articles to index")
                break
            
            print(f"\n[Indexer] Processing batch of {len(articles)} articles...")
            
            # Prepare texts for embedding
            texts = []
            for article in articles:
                # Combine headline, summary, and start of full text for richer embedding
                headline = article.get('headline', '') or ''
                summary = article.get('summary', '') or ''
                full_text = article.get('full_text', '') or ''
                
                combined = f"{headline}\n\n{summary}\n\n{full_text[:2000]}"
                texts.append(combined.strip())
            
            # Generate embeddings in batch
            print(f"[Indexer] Generating embeddings...")
            embeddings = await embed_service.generate_embeddings_batch(texts)
            
            # Store embeddings
            success_count = 0
            for i, (article, embedding) in enumerate(zip(articles, embeddings)):
                if embedding:
                    success = await vector_service.index_article(
                        article_id=article['id'],
                        embedding=embedding
                    )
                    if success:
                        success_count += 1
                        print(f"  ✓ Indexed: {article.get('headline', 'Unknown')[:50]}...")
                    else:
                        print(f"  ✗ Failed to index: {article['id']}")
                else:
                    print(f"  ✗ No embedding for: {article.get('headline', 'Unknown')[:50]}...")
            
            total_indexed += success_count
            print(f"[Indexer] Batch complete: {success_count}/{len(articles)} indexed")
            
            # Small delay between batches
            await asyncio.sleep(1)
        
        print(f"\n[Indexer] Total articles indexed: {total_indexed}")
        return total_indexed
        
    finally:
        await vector_service.disconnect()
        await db.disconnect()


async def index_learning_modules():
    """
    Index learning modules for the AI Coach.
    These are stored in the frontend but we can embed them for RAG.
    """
    # Learning module content - matches frontend data
    modules = [
        {
            "id": "1",
            "title": "Introduction to FundThesis",
            "content": """Welcome to FundThesis, your AI-powered platform for learning about investing.
            This module covers: getting started with the platform, understanding your goals,
            setting up your learning path, and navigating the features."""
        },
        {
            "id": "2", 
            "title": "What is a Stock and ETF",
            "content": """Stocks represent ownership in a company. When you buy a stock, you own a small piece
            of that company. ETFs (Exchange-Traded Funds) are baskets of stocks that trade like a single stock.
            They offer diversification by holding many different securities. Key concepts: shares, ownership,
            dividends, fund management, expense ratios."""
        },
        {
            "id": "3",
            "title": "Buying vs Selling",
            "content": """Understanding buy and sell orders is fundamental to trading. Buy orders let you 
            acquire shares, sell orders let you dispose of them. Key concepts: bid price, ask price,
            market orders, limit orders, stop-loss orders, order execution, trading hours."""
        },
        {
            "id": "4",
            "title": "Portfolio Basics",
            "content": """A portfolio is your collection of investments. Diversification means spreading
            your investments across different assets to reduce risk. Asset allocation is deciding how much
            to put in stocks, bonds, and other investments. Key concepts: diversification, correlation,
            rebalancing, risk tolerance."""
        },
        {
            "id": "5",
            "title": "Market Movement & Risk",
            "content": """Markets move up and down based on many factors. Volatility measures how much
            prices swing. Beta measures how much a stock moves relative to the market. Understanding risk
            helps you make better investment decisions. Key concepts: volatility, beta, systematic risk,
            unsystematic risk, market corrections."""
        },
        {
            "id": "6",
            "title": "Company Research Basics",
            "content": """Researching companies helps you make informed decisions. Look at financial 
            statements, earnings reports, and industry trends. Fundamental analysis examines a company's
            health. Key concepts: P/E ratio, revenue, earnings, balance sheet, cash flow, SEC filings."""
        },
        {
            "id": "7",
            "title": "Long-Term vs Short-Term",
            "content": """Investment time horizon affects your strategy. Long-term investing (years) 
            typically involves less trading and more patience. Short-term trading (days/weeks) requires
            more active management. Key concepts: buy and hold, day trading, swing trading,
            compound growth, capital gains tax."""
        },
        {
            "id": "8",
            "title": "Reading a Graph",
            "content": """Charts visualize price movements over time. Candlestick charts show open, high,
            low, and close prices. Technical analysis uses patterns to predict future movements.
            Key concepts: support, resistance, moving averages, volume, trend lines, patterns."""
        },
        {
            "id": "9",
            "title": "Sustainability Factors",
            "content": """ESG investing considers Environmental, Social, and Governance factors.
            Companies with strong ESG practices may perform better long-term. Key concepts:
            carbon footprint, social responsibility, corporate governance, sustainable investing,
            impact investing."""
        }
    ]
    
    embed_service = get_embed_service()
    
    print("\n[Indexer] Indexing learning modules...")
    
    # Generate embeddings for modules
    texts = [f"{m['title']}\n\n{m['content']}" for m in modules]
    embeddings = await embed_service.generate_embeddings_batch(texts)
    
    # Store in a simple file for now (could be added to DB in future)
    import json
    
    indexed_modules = []
    for module, embedding in zip(modules, embeddings):
        if embedding:
            indexed_modules.append({
                "id": module["id"],
                "title": module["title"],
                "content": module["content"],
                "embedding": embedding
            })
            print(f"  ✓ Indexed module: {module['title']}")
    
    # Save to file
    output_path = backend_path / "data" / "learning_modules_indexed.json"
    output_path.parent.mkdir(exist_ok=True)
    
    # Save without embeddings in the JSON (too large), just the metadata
    modules_meta = [
        {"id": m["id"], "title": m["title"], "content": m["content"]}
        for m in indexed_modules
    ]
    
    with open(output_path, 'w') as f:
        json.dump(modules_meta, f, indent=2)
    
    print(f"\n[Indexer] Indexed {len(indexed_modules)} learning modules")
    return len(indexed_modules)


async def run_indexer():
    """Main entry point for indexer job."""
    print("=" * 80)
    print("Starting Indexer Job")
    print("=" * 80)
    
    try:
        # Index articles
        print("\n[1/2] Indexing articles...")
        article_count = await index_articles()
        
        # Index learning modules
        print("\n[2/2] Indexing learning modules...")
        module_count = await index_learning_modules()
        
        print("\n" + "=" * 80)
        print(f"Indexer complete: {article_count} articles, {module_count} modules indexed")
        print("=" * 80)
        
        return article_count + module_count
        
    except Exception as e:
        print(f"Error in indexer job: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_indexer())

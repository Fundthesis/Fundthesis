"""Script to index articles with embeddings for vector search."""

import asyncio
import os
from dotenv import load_dotenv
from rag.embeddings import EmbeddingService
from rag.vector_search import VectorSearchService

load_dotenv()


async def index_all_articles(batch_size: int = 50, delay: float = 0.1):
    """
    Index all articles without embeddings.

    Args:
        batch_size: Number of articles to process in each batch
        delay: Delay between batches (seconds) to respect rate limits
    """
    # Check credentials before starting
    if not os.getenv("AZURE_EMBED_ENDPOINT") or not os.getenv("AZURE_EMBED_KEY"):
        print("ERROR: Missing required environment variables:")
        print("  - AZURE_EMBED_ENDPOINT")
        print("  - AZURE_EMBED_KEY")
        print("\nSet these in your .env file or environment.")
        return

    embeddings = EmbeddingService()
    vector_search = VectorSearchService()

    await vector_search.connect()
    
    try:
        total_indexed = 0
        
        while True:
            # Get articles without embeddings
            articles = await vector_search.get_articles_without_embeddings(limit=batch_size)
            
            if not articles:
                print("No more articles to index.")
                break
            
            print(f"Processing batch of {len(articles)} articles...")
            
            # Generate embeddings for this batch
            texts_to_embed = []
            for article in articles:
                # Combine headline, summary, and full_text for embedding
                text_parts = []
                if article.get('headline'):
                    text_parts.append(article['headline'])
                if article.get('summary'):
                    text_parts.append(article['summary'])
                if article.get('full_text'):
                    # Limit full_text to first 2000 chars to avoid token limits
                    text_parts.append(article['full_text'][:2000])
                
                combined_text = ' '.join(text_parts)
                if combined_text.strip():
                    texts_to_embed.append(combined_text)
                else:
                    texts_to_embed.append("")  # Placeholder for empty articles
            
            # Generate embeddings
            embeddings_list = await embeddings.generate_embeddings_batch(texts_to_embed)

            # Collect valid (id, embedding) pairs for batch update
            batch_data = []
            for i, article in enumerate(articles):
                if i < len(embeddings_list) and embeddings_list[i]:
                    batch_data.append((article['id'], embeddings_list[i]))

            # Batch update all embeddings in one query
            indexed_in_batch = await vector_search.index_articles_batch(batch_data)
            total_indexed += indexed_in_batch
            
            print(f"Indexed {indexed_in_batch} articles in this batch. Total: {total_indexed}")

            # Stop if no articles were indexed (prevents infinite loop on failures)
            if indexed_in_batch == 0:
                print("No articles indexed in this batch. Stopping to prevent infinite loop.")
                print("Check your Azure credentials and API connectivity.")
                break

            # Delay between batches to respect rate limits
            if delay > 0:
                await asyncio.sleep(delay)
        
        print(f"\n✅ Indexing complete! Total articles indexed: {total_indexed}")
        
    except Exception as e:
        print(f"Error during indexing: {e}")
    finally:
        await vector_search.disconnect()


if __name__ == "__main__":
    asyncio.run(index_all_articles())

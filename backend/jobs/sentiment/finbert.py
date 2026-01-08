"""FinBERT sentiment analysis using transformers."""
from transformers import pipeline
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize FinBERT pipeline
try:
    pipe = pipeline("text-classification", model="ProsusAI/finbert")
    logging.info("FinBERT model loaded successfully.")
except Exception as e:
    logging.error(f"Error loading FinBERT model: {e}")
    raise


def analyze_sentiment(text: str) -> str:
    """
    Analyze sentiment of financial text using FinBERT.
    Returns: 'positive', 'negative', or 'neutral'
    """
    if not text:
        return 'neutral'
    
    try:
        result = pipe(text)
        label = result[0]['label'].lower()
        
        # Map FinBERT labels to our format
        # FinBERT typically returns: 'positive', 'negative', 'neutral'
        if label in ['positive', 'negative', 'neutral']:
            return label
        else:
            # Fallback mapping if labels differ
            label_mapping = {
                'POSITIVE': 'positive',
                'NEGATIVE': 'negative',
                'NEUTRAL': 'neutral'
            }
            return label_mapping.get(label.upper(), 'neutral')
    except Exception as e:
        logging.error(f"Error analyzing sentiment: {e}")
        return 'neutral'


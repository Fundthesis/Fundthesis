# Sentiment Analysis

This document describes the sentiment analysis system in FundThesis, which uses FinBERT to classify financial news articles as positive, negative, or neutral.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [FinBERT Model](#finbert-model)
- [Implementation](#implementation)
- [Scheduled Execution](#scheduled-execution)
- [Accuracy & Performance](#accuracy--performance)
- [Limitations](#limitations)

---

## Overview

FundThesis uses **FinBERT**, a financial domain-specific BERT model, to analyze the sentiment of financial news articles. This helps users quickly understand whether news is bullish (positive), bearish (negative), or neutral for specific stocks.

### Purpose

- **Classify News Sentiment:** Automatically label articles as positive, negative, or neutral
- **Filter News:** Help users focus on relevant sentiment
- **Market Insights:** Understand overall market sentiment trends
- **Stock-Specific Analysis:** Identify sentiment for individual stocks

### Key Characteristics

- **Model:** FinBERT (ProsusAI/finbert)
- **Classification:** Three-class (positive, negative, neutral)
- **Update Frequency:** Every 4 hours (after news scraping)
- **Coverage:** All articles in the database

---

## How It Works

### High-Level Process

1. **Identify Unprocessed Articles:** Find articles without sentiment labels
2. **Extract Text:** Get article headline and summary
3. **Run FinBERT:** Classify sentiment using transformer model
4. **Store Results:** Update article records with sentiment labels
5. **Display in UI:** Show sentiment badges and filters

### Data Flow

```
Unprocessed Articles (Database)
    │
    ▼
Text Extraction (Headline + Summary)
    │
    ▼
FinBERT Pipeline
    │
    ├─→ Tokenization
    ├─→ Model Inference
    └─→ Label Mapping
    │
    ▼
Sentiment Label (positive/negative/neutral)
    │
    ▼
Database Update (Article.label)
    │
    ▼
Frontend Display (Sentiment Badges)
```

---

## FinBERT Model

### Model Details

**Model Name:** `ProsusAI/finbert`

**Type:** BERT-based transformer model

**Specialization:** Trained specifically on financial text

**Input:** Financial news text (headline, summary, or full article)

**Output:** Sentiment classification with confidence score

### Why FinBERT?

**Advantages:**
- **Domain-Specific:** Trained on financial text, understands financial terminology
- **Better Accuracy:** Outperforms general sentiment models on financial text
- **Pre-trained:** No need for custom training data
- **Easy Integration:** Simple pipeline interface via Hugging Face

**Comparison:**
- **General BERT:** Less accurate on financial text
- **VADER/TextBlob:** Rule-based, less sophisticated
- **Custom Model:** Would require training data and resources

### Model Architecture

- **Base:** BERT (Bidirectional Encoder Representations from Transformers)
- **Layers:** 12 transformer layers
- **Parameters:** ~110 million
- **Vocabulary:** Financial domain vocabulary

---

## Implementation

### Core Component (`finbert.py`)

```python
from transformers import pipeline

# Initialize FinBERT pipeline
pipe = pipeline("text-classification", model="ProsusAI/finbert")

def analyze_sentiment(text: str) -> str:
    """Analyze sentiment and return 'positive', 'negative', or 'neutral'"""
    result = pipe(text)
    label = result[0]['label'].lower()
    return label  # 'positive', 'negative', or 'neutral'
```

### Text Processing

**Input Text:**
- Primary: Article headline
- Secondary: Article summary (if headline unavailable)
- Fallback: First 512 characters of full text

**Text Cleaning:**
- Remove HTML tags
- Normalize whitespace
- Handle special characters
- Truncate to model's max length (512 tokens)

### Label Mapping

**FinBERT Output → FundThesis Format:**
- `positive` → `positive`
- `negative` → `negative`
- `neutral` → `neutral`

**Confidence Scores:**
- FinBERT provides confidence scores (0-1)
- Currently not stored, but available for future use
- Could be used for filtering low-confidence classifications

---

## Scheduled Execution

### GitHub Actions Workflow

**File:** `.github/workflows/sentiment-job.yml`

**Schedule:** Every 4 hours at :30 minutes (offset from scraper)

**Cron Expression:** `30 */4 * * *`

**Process:**
1. Checkout code
2. Set up Python 3.11
3. Install dependencies (including `requirements-ml.txt` for transformers)
4. Generate Prisma client
5. Run sentiment job: `python jobs/sentiment/runner.py`

### Manual Execution

```bash
cd backend
python -m jobs.sentiment.runner
```

### Job Runner (`runner.py`)

**Responsibilities:**
- Query database for articles without sentiment labels
- Process articles in batches
- Run FinBERT classification
- Update article records
- Handle errors gracefully
- Log progress

**Error Handling:**
- Continues processing if one article fails
- Logs errors for debugging
- Skips articles with insufficient text

---

## Accuracy & Performance

### Expected Accuracy

**Typical Performance:**
- **Accuracy:** ~75-85% on financial text
- **Positive/Negative:** Higher accuracy (clear sentiment)
- **Neutral:** Lower accuracy (ambiguous cases)

### Factors Affecting Accuracy

**Text Quality:**
- **Headline Only:** May miss context, lower accuracy
- **Headline + Summary:** Better context, higher accuracy
- **Full Article:** Best context, but slower processing

**Article Characteristics:**
- **Clear Sentiment:** High accuracy (e.g., "Stock surges 10%")
- **Mixed Sentiment:** Lower accuracy (e.g., "Mixed earnings results")
- **Neutral News:** May be misclassified (e.g., "Company announces new product")

**Domain Specificity:**
- **Financial Terms:** FinBERT handles well
- **General News:** May be less accurate
- **Technical Analysis:** Good accuracy

### Performance Metrics

**Processing Speed:**
- ~1-2 seconds per article (CPU)
- Faster with GPU acceleration (not currently used)
- Batch processing improves throughput

**Resource Usage:**
- Model loading: ~500MB RAM
- Inference: ~100-200MB per article
- Total: ~1-2GB for job execution

---

## Limitations

### Model Limitations

1. **Binary Classification Bias:** Tends toward positive/negative, may misclassify neutral
2. **Context Dependency:** May miss nuanced sentiment in longer articles
3. **Language:** English only (no multilingual support)
4. **Sarcasm/Irony:** Cannot detect sarcastic or ironic statements

### Implementation Limitations

1. **Text Length:** Limited to 512 tokens (BERT max length)
2. **No Confidence Threshold:** All classifications stored, even low-confidence
3. **Single Model:** No ensemble or voting mechanism
4. **No Re-analysis:** Articles analyzed once, not re-analyzed if updated

### Financial Domain Limitations

1. **Market Context:** Doesn't consider broader market conditions
2. **Historical Context:** Doesn't compare to past sentiment
3. **Stock-Specific:** Doesn't account for stock-specific factors
4. **Time Sensitivity:** Doesn't weight recency of news

---

## Usage

### Database Storage

**Article Model:**
```prisma
model Article {
  id           String
  headline     String?
  summary      String?
  label        String?  // 'positive', 'negative', or 'neutral'
  // ... other fields
}
```

### Frontend Display

**Sentiment Badges:**
- Green badge: Positive sentiment
- Red badge: Negative sentiment
- Gray badge: Neutral sentiment

**Filtering:**
- Filter articles by sentiment
- View sentiment trends over time
- Stock-specific sentiment analysis

### API Access

```http
GET /api/news?sentiment=positive
GET /api/news?sentiment=negative
GET /api/news/ticker/{ticker}?sentiment=positive
```

---

## Future Improvements

### Model Enhancements

1. **Confidence Thresholds:** Filter low-confidence classifications
2. **Multi-Model Ensemble:** Combine multiple models for better accuracy
3. **Fine-Tuning:** Fine-tune on FundThesis-specific articles
4. **Aspect-Based Sentiment:** Identify sentiment for specific aspects (earnings, products, management)

### Process Improvements

1. **Incremental Updates:** Re-analyze articles when updated
2. **Batch Optimization:** Process articles in larger batches
3. **GPU Acceleration:** Use GPU for faster processing
4. **Caching:** Cache model results for duplicate articles

### Feature Enhancements

1. **Sentiment Scores:** Store confidence scores, not just labels
2. **Sentiment Trends:** Track sentiment changes over time
3. **Stock Aggregation:** Aggregate sentiment per stock
4. **Sentiment Heatmaps:** Visualize sentiment across sectors

---

## Technical Details

**Dependencies:**
- `transformers` - Hugging Face transformers library
- `torch` - PyTorch (model backend)
- `sentencepiece` - Tokenization

**Model Loading:**
- First load: Downloads model (~500MB)
- Subsequent loads: Uses cached model
- Loading time: ~10-30 seconds

**File Locations:**
- Model: `backend/jobs/sentiment/finbert.py`
- Runner: `backend/jobs/sentiment/runner.py`
- Workflow: `.github/workflows/sentiment-job.yml`

---

## Conclusion

The sentiment analysis system provides valuable classification of financial news, helping users quickly understand market sentiment. FinBERT offers good accuracy on financial text, and the system runs automatically via scheduled jobs.

**Status:** ✅ Production Ready  
**Accuracy:** Good (75-85% on financial text)  
**Update Frequency:** Every 4 hours

---

## Example Output

**Input Article:**
```
Headline: "Apple Stock Surges on Strong Q4 Earnings Beat"
Summary: "Apple Inc. reported better-than-expected earnings..."
```

**FinBERT Analysis:**
```
Label: positive
Confidence: 0.92
```

**Database Update:**
```sql
UPDATE articles 
SET label = 'positive' 
WHERE id = 'article-uuid';
```

**Frontend Display:**
- Green "POSITIVE" badge on article card
- Article appears in positive sentiment filter
- Contributes to positive sentiment count for AAPL

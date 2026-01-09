# XGBoost Stock Price Forecasting

This document describes the XGBoost-based stock price forecasting system in FundThesis.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Model Architecture](#model-architecture)
- [Features & Engineering](#features--engineering)
- [Training Process](#training-process)
- [Forecast Generation](#forecast-generation)
- [Scheduled Execution](#scheduled-execution)
- [Performance & Accuracy](#performance--accuracy)
- [Limitations](#limitations)

---

## Overview

FundThesis uses **XGBoost** (Extreme Gradient Boosting) to generate 30-day stock price forecasts. XGBoost is a powerful machine learning algorithm that excels at time-series forecasting and handles non-linear relationships in financial data.

### Purpose

- **Predict Future Prices:** Forecast stock prices for the next 30 days
- **Support Investment Decisions:** Provide data-driven price predictions
- **Risk Assessment:** Help users understand potential price movements
- **Portfolio Planning:** Enable forward-looking portfolio analysis

### Key Characteristics

- **Model Type:** Gradient Boosting Decision Trees (XGBoost Regressor)
- **Forecast Horizon:** 30 days
- **Update Frequency:** Daily (after market close)
- **Coverage:** All tracked stocks in the system

---

## How It Works

### High-Level Process

1. **Data Collection:** Fetch historical stock data (1 year)
2. **Feature Engineering:** Create technical indicators and features
3. **Data Preparation:** Split into training and validation sets
4. **Model Training:** Train XGBoost model on historical patterns
5. **Forecast Generation:** Predict next 30 days of prices
6. **Storage:** Save forecasts to database for frontend access

### Data Flow

```
Historical Stock Data (yFinance)
    │
    ▼
Feature Engineering
    │
    ├─→ Technical Indicators (SMA, EMA, RSI, etc.)
    ├─→ Price Features (Open, High, Low, Close, Volume)
    └─→ Time Features (Day of week, Month, etc.)
    │
    ▼
Data Preprocessing
    │
    ├─→ Robust Scaling (handles outliers)
    └─→ Train/Test Split
    │
    ▼
XGBoost Model Training
    │
    ├─→ Hyperparameter Tuning (optional)
    └─→ Model Validation
    │
    ▼
30-Day Forecast Generation
    │
    ▼
PostgreSQL Database (StockForecast table)
```

---

## Model Architecture

### XGBoost Configuration

**Model Type:** `XGBRegressor`

**Key Hyperparameters:**
- `n_estimators`: Number of boosting rounds (typically 100-500)
- `max_depth`: Maximum tree depth (typically 3-7)
- `learning_rate`: Step size shrinkage (typically 0.01-0.1)
- `subsample`: Row sampling ratio (typically 0.8-1.0)
- `colsample_bytree`: Column sampling ratio (typically 0.8-1.0)
- `min_child_weight`: Minimum sum of instance weight (typically 1-5)

**Objective:** Regression (predicting continuous price values)

**Evaluation Metric:** Mean Squared Error (MSE), R² Score

### Model Selection Rationale

**Why XGBoost?**
- **Handles Non-Linearity:** Financial markets have complex, non-linear patterns
- **Feature Importance:** Provides insights into which factors matter most
- **Robust to Outliers:** Less sensitive to extreme values than linear models
- **Fast Training:** Efficient implementation for large datasets
- **No Assumptions:** Doesn't require data to follow specific distributions

**Alternatives Considered:**
- ARIMA/Prophet: Better for pure time-series, but less flexible
- LSTM: More complex, requires more data and computation
- Linear Regression: Too simple for financial data complexity

---

## Features & Engineering

### Input Features

#### 1. **Price Features**
- Open, High, Low, Close prices
- Volume
- Price changes (daily, weekly)
- Price ratios (High/Low, Close/Open)

#### 2. **Technical Indicators**
- **Moving Averages:**
  - Simple Moving Average (SMA) - 7, 14, 30 days
  - Exponential Moving Average (EMA) - 7, 14, 30 days
- **Momentum Indicators:**
  - Relative Strength Index (RSI)
  - Rate of Change (ROC)
- **Volatility:**
  - Standard deviation of returns
  - Bollinger Bands (upper, lower, middle)

#### 3. **Time Features**
- Day of week (1-7)
- Month (1-12)
- Day of month (1-31)
- Is weekend? (boolean)
- Days since start of data

#### 4. **Lag Features**
- Previous day's close price
- Previous week's average price
- Previous month's average price
- Historical price patterns

### Feature Engineering Process

```python
# Example feature engineering
def create_features(df):
    # Moving averages
    df['sma_7'] = df['Close'].rolling(7).mean()
    df['sma_30'] = df['Close'].rolling(30).mean()
    
    # RSI
    df['rsi'] = calculate_rsi(df['Close'])
    
    # Price changes
    df['price_change'] = df['Close'].pct_change()
    df['volume_change'] = df['Volume'].pct_change()
    
    # Time features
    df['day_of_week'] = df.index.dayofweek
    df['month'] = df.index.month
    
    return df
```

### Data Preprocessing

**Robust Scaling:**
- Uses `RobustScaler` instead of `StandardScaler`
- Less sensitive to outliers
- Better for financial data with extreme values

**Handling Missing Data:**
- Forward fill for minor gaps
- Drop rows with critical missing values
- Ensure minimum data requirements (50+ days)

---

## Training Process

### Training Strategy

**Approach:** Train-test split (not time-series cross-validation)

**Split Ratio:**
- Training: First 80% of data
- Testing: Last 20% of data

**Rationale:**
- Simulates real-world scenario (train on past, predict future)
- Prevents data leakage
- More realistic performance evaluation

### Model Training

```python
# Simplified training process
def train_model(X_train, y_train):
    model = XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    return model
```

### Validation

**Metrics:**
- **MSE (Mean Squared Error):** Average squared difference
- **R² Score:** Coefficient of determination (0-1, higher is better)
- **MAE (Mean Absolute Error):** Average absolute difference

**Performance Targets:**
- R² > 0.7 (good fit)
- MSE as low as possible
- Consistent performance across different stocks

---

## Forecast Generation

### Prediction Method

**Approach:** Direct multi-step forecasting

**Process:**
1. Use most recent data point as starting point
2. Generate features for next day
3. Predict next day's price
4. Use predicted price to generate features for day 2
5. Repeat for 30 days

**Alternative Considered:** Iterative single-step (current approach is simpler but may accumulate error)

### Forecast Storage

**Database Schema:**
```prisma
model StockForecast {
  id              String   @id @default(uuid())
  symbol          String
  forecastDate    DateTime @map("forecast_date")
  predictedPrice  Decimal  @map("predicted_price")
  confidence      Decimal?
  modelVersion    String?  @map("model_version")
  createdAt       DateTime @default(now()) @map("created_at")
}
```

**Storage Strategy:**
- One forecast per symbol per date
- Historical forecasts retained for model evaluation
- Latest forecasts used by frontend

---

## Scheduled Execution

### GitHub Actions Workflow

**File:** `.github/workflows/forecasting-job.yml`

**Schedule:** Daily at 6:00 AM UTC (after market close)

**Cron Expression:** `0 6 * * *`

**Process:**
1. Checkout code
2. Set up Python 3.11
3. Install dependencies (`requirements.txt`, `requirements-ml.txt`)
4. Generate Prisma client
5. Run forecasting job: `python jobs/forecasting/runner.py`

### Manual Execution

```bash
cd backend
python -m jobs.forecasting.runner
```

### Job Runner (`runner.py`)

**Responsibilities:**
- Load list of tracked stocks
- Iterate through each stock
- Generate forecast for each
- Store forecasts in database
- Handle errors gracefully
- Log progress and results

**Error Handling:**
- Continues processing if one stock fails
- Logs errors for debugging
- Skips stocks with insufficient data

---

## Performance & Accuracy

### Current Performance

**Typical Metrics:**
- R² Score: 0.6-0.8 (varies by stock)
- MSE: Varies significantly by stock volatility
- Direction Accuracy: ~55-65% (predicting up/down correctly)

### Factors Affecting Accuracy

**Stock Characteristics:**
- **High Volatility:** Lower accuracy (harder to predict)
- **Trending Stocks:** Higher accuracy (clearer patterns)
- **News-Driven:** Lower accuracy (external events unpredictable)

**Market Conditions:**
- **Bull Markets:** Generally better predictions
- **Bear Markets:** More uncertainty
- **High Volatility Periods:** Lower accuracy

### Model Limitations

1. **Assumes Continuity:** Doesn't account for sudden news events
2. **No External Factors:** Doesn't consider macroeconomics, company news
3. **Short-Term Focus:** 30-day horizon is near-term
4. **Historical Bias:** Trained on past data, may not reflect future changes

---

## Limitations

### Technical Limitations

1. **Data Quality:** Dependent on yFinance data accuracy
2. **Feature Engineering:** Limited to price/volume data (no fundamental analysis)
3. **Model Complexity:** Simple XGBoost may miss complex patterns
4. **Computational Cost:** Training takes time for many stocks

### Financial Limitations

1. **Not Financial Advice:** Forecasts are predictions, not guarantees
2. **Market Uncertainty:** Markets are inherently unpredictable
3. **Black Swan Events:** Cannot predict unexpected major events
4. **Regulatory Changes:** Doesn't account for policy changes

### Accuracy Limitations

1. **Direction vs. Magnitude:** Better at direction than exact price
2. **Volatile Stocks:** Lower accuracy for high-volatility stocks
3. **Short-Term Bias:** Optimized for 30-day horizon
4. **No Confidence Intervals:** Doesn't provide uncertainty estimates

---

## Future Improvements

### Model Enhancements

1. **Ensemble Methods:** Combine multiple models for better accuracy
2. **Feature Expansion:** Add fundamental data (P/E ratio, earnings, etc.)
3. **News Integration:** Incorporate sentiment from news articles
4. **Confidence Intervals:** Provide prediction uncertainty ranges

### Process Improvements

1. **Hyperparameter Tuning:** Automated optimization (Optuna, GridSearch)
2. **Model Versioning:** Track model performance over time
3. **A/B Testing:** Compare different model configurations
4. **Real-Time Updates:** Update forecasts more frequently

### Data Improvements

1. **More Data Sources:** Combine multiple data providers
2. **Fundamental Data:** Add company financials
3. **Market Data:** Include broader market indicators
4. **Alternative Data:** Social media sentiment, analyst ratings

---

## Usage

### Frontend Access

Forecasts are accessible via API:

```http
GET /api/stock/{symbol}?days=30
```

Response includes:
- Historical prices
- Forecasted prices for next 30 days
- Confidence scores (if available)

### Display in UI

- **Charts:** Historical + forecasted prices on same chart
- **Forecast Table:** List of predicted prices by date
- **Confidence Indicators:** Visual representation of forecast certainty

---

## Conclusion

The XGBoost forecasting system provides valuable price predictions to help users make informed investment decisions. While not perfect, it offers a data-driven approach to understanding potential stock price movements. The system is production-ready, runs daily via GitHub Actions, and provides forecasts for all tracked stocks.

**Status:** ✅ Production Ready  
**Accuracy:** Moderate (varies by stock)  
**Update Frequency:** Daily

---

## Technical Details

**Dependencies:**
- `xgboost` - Gradient boosting framework
- `yfinance` - Stock data fetching
- `pandas` - Data manipulation
- `numpy` - Numerical operations
- `scikit-learn` - Preprocessing and metrics

**File Locations:**
- Model: `backend/jobs/forecasting/xgboost_model.py`
- Runner: `backend/jobs/forecasting/runner.py`
- Workflow: `.github/workflows/forecasting-job.yml`

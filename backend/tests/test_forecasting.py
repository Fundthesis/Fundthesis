"""Tests for forecasting functionality."""
import pytest
from unittest.mock import patch, Mock
import pandas as pd
import numpy as np
from jobs.forecasting.xgboost_model import get_next_30_day_predictions


@patch('jobs.forecasting.xgboost_model.yf.Ticker')
@patch('lib.stock_data.yf.Ticker')
def test_xgboost_forecast(mock_ticker_data, mock_ticker_model):
    """Test XGBoost model generates predictions."""
    # Mock historical data
    dates = pd.date_range('2023-01-01', periods=365, freq='D')
    mock_history = pd.DataFrame({
        'Open': np.random.uniform(100, 150, 365),
        'High': np.random.uniform(150, 200, 365),
        'Low': np.random.uniform(50, 100, 365),
        'Close': np.random.uniform(100, 150, 365),
        'Volume': np.random.uniform(1000000, 5000000, 365)
    }, index=dates)
    
    mock_ticker = Mock()
    mock_ticker.history.return_value = mock_history
    mock_ticker_data.return_value = mock_ticker
    mock_ticker_model.return_value = mock_ticker
    
    # Generate forecast
    forecast_df, mse, r2 = get_next_30_day_predictions('TEST', forecast_days=30)
    
    assert forecast_df is not None
    assert not forecast_df.empty
    assert 'Date' in forecast_df.columns
    assert 'Predicted_Close' in forecast_df.columns
    assert len(forecast_df) == 30
    assert mse is not None
    assert r2 is not None


@patch('jobs.forecasting.xgboost_model.yf.Ticker')
@patch('lib.stock_data.yf.Ticker')
def test_forecast_data_formatting(mock_ticker_data, mock_ticker_model):
    """Test forecast data is properly formatted."""
    dates = pd.date_range('2023-01-01', periods=100, freq='D')
    mock_history = pd.DataFrame({
        'Open': np.random.uniform(100, 150, 100),
        'High': np.random.uniform(150, 200, 100),
        'Low': np.random.uniform(50, 100, 100),
        'Close': np.random.uniform(100, 150, 100),
        'Volume': np.random.uniform(1000000, 5000000, 100)
    }, index=dates)
    
    mock_ticker = Mock()
    mock_ticker.history.return_value = mock_history
    mock_ticker_data.return_value = mock_ticker
    mock_ticker_model.return_value = mock_ticker
    
    forecast_df, _, _ = get_next_30_day_predictions('TEST', forecast_days=30)
    
    # Check data types
    assert pd.api.types.is_datetime64_any_dtype(forecast_df['Date'])
    assert pd.api.types.is_numeric_dtype(forecast_df['Predicted_Close'])
    
    # Check values are reasonable
    assert forecast_df['Predicted_Close'].min() > 0
    assert forecast_df['Predicted_Close'].max() < 10000  # Sanity check


@patch('jobs.forecasting.xgboost_model.yf.Ticker')
def test_forecast_invalid_symbol(mock_ticker):
    """Test handling of invalid symbol."""
    mock_ticker.return_value.history.return_value = pd.DataFrame()  # Empty data
    
    forecast_df, mse, r2 = get_next_30_day_predictions('INVALID', forecast_days=30)
    
    # Should handle gracefully
    assert forecast_df is None or forecast_df.empty


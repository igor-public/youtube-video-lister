import React, { useState, useEffect } from 'react';

function AssetMonitorSection({ showStatus }) {
  const [assets, setAssets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    source: 'manual',
    category: 'crypto',
    notes: ''
  });

  // Predefined asset suggestions
  const assetSuggestions = [
    { name: 'Bitcoin', symbol: 'BTC', category: 'crypto' },
    { name: 'Ethereum', symbol: 'ETH', category: 'crypto' },
    { name: 'Gold', symbol: 'XAU', category: 'commodity' },
    { name: 'Silver', symbol: 'XAG', category: 'commodity' },
    { name: 'Crude Oil', symbol: 'CL', category: 'commodity' },
    { name: 'S&P 500', symbol: 'SPX', category: 'index' },
  ];

  const priceSources = [
    { id: 'manual', name: 'Manual Entry', description: 'Enter prices manually' },
    { id: 'coinmarketcap', name: 'CoinMarketCap', description: 'Crypto prices' },
    { id: 'coingecko', name: 'CoinGecko', description: 'Crypto prices' },
    { id: 'yahoo', name: 'Yahoo Finance', description: 'Stocks, commodities' },
    { id: 'tradingview', name: 'TradingView', description: 'All markets' },
    { id: 'alphavantage', name: 'Alpha Vantage', description: 'Stocks, forex, crypto' },
    { id: 'finnhub', name: 'Finnhub', description: 'Real-time data' },
  ];

  const categories = [
    { id: 'crypto', name: 'Cryptocurrency', icon: '₿' },
    { id: 'commodity', name: 'Commodity', icon: '🛢️' },
    { id: 'stock', name: 'Stock', icon: '📈' },
    { id: 'index', name: 'Index', icon: '📊' },
    { id: 'forex', name: 'Forex', icon: '💱' },
    { id: 'other', name: 'Other', icon: '💼' },
  ];

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      showStatus('Failed to load assets', 'error');
    }
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      symbol: '',
      source: 'manual',
      category: 'crypto',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      symbol: asset.symbol,
      source: asset.source,
      category: asset.category,
      notes: asset.notes || ''
    });
    setShowModal(true);
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Are you sure you want to remove this asset from monitoring?')) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showStatus('Asset removed successfully', 'success');
        loadAssets();
      } else {
        showStatus('Failed to remove asset', 'error');
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      showStatus('Failed to remove asset', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.symbol) {
      showStatus('Asset name and symbol are required', 'error');
      return;
    }

    try {
      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showStatus(editingAsset ? 'Asset updated successfully' : 'Asset added successfully', 'success');
        setShowModal(false);
        loadAssets();
      } else {
        showStatus('Failed to save asset', 'error');
      }
    } catch (error) {
      console.error('Failed to save asset:', error);
      showStatus('Failed to save asset', 'error');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData({
      ...formData,
      name: suggestion.name,
      symbol: suggestion.symbol,
      category: suggestion.category
    });
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : '💼';
  };

  return (
    <div className="asset-monitor-section">
      <button
        onClick={handleAddAsset}
        style={{
          width: '100%',
          padding: '6px 12px',
          fontSize: '13px',
          backgroundColor: '#4a9eff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: '500',
          marginBottom: '12px'
        }}
      >
        + Add Asset
      </button>

      <div style={{ marginTop: '12px' }}>
        {assets.length === 0 ? (
          <p style={{ color: '#5f6368', fontSize: '13px', fontStyle: 'italic' }}>
            No assets being monitored. Click "Add Asset" to start tracking prices.
          </p>
        ) : (
          <div>
            <p style={{ fontSize: '12px', color: '#5f6368', marginBottom: '8px' }}>
              Monitoring {assets.length} asset{assets.length !== 1 ? 's' : ''}
            </p>
            {assets.map(asset => (
              <div
                key={asset.id}
                style={{
                  padding: '8px 4px',
                  marginBottom: '4px',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getCategoryIcon(asset.category)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '13px' }}>{asset.name}</strong>
                        <span style={{ fontSize: '11px', color: '#80868b' }}>
                          {asset.symbol}
                        </span>
                      </div>
                      {asset.notes && (
                        <div style={{ fontSize: '11px', color: '#80868b', marginTop: '2px' }}>
                          {asset.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    <button
                      className="btn-icon btn-edit-icon"
                      onClick={() => handleEditAsset(asset)}
                      title="Edit asset"
                    >
                      ✎
                    </button>
                    <button
                      className="btn-icon btn-delete-icon"
                      onClick={() => handleDeleteAsset(asset.id)}
                      title="Remove asset"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Asset Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Quick Suggestions */}
              {!editingAsset && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                    Quick Add:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {assetSuggestions.map(suggestion => (
                      <button
                        key={suggestion.symbol}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f1f3f4',
                          border: '1px solid #dadce0',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {suggestion.name} ({suggestion.symbol})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Asset Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                  Asset Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Bitcoin, Gold, S&P 500"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              {/* Symbol */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                  Symbol/Ticker *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., BTC, XAU, SPX"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Source */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                  Price Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  {priceSources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.name} - {source.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this asset or why you're monitoring it..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4a9eff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {editingAsset ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetMonitorSection;

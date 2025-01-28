// src/components/TradeButtons.tsx
import React from 'react';

const TradeButtons: React.FC = () => {
  const handleBuy = () => {
    alert('Buy order placed!');
  };

  const handleSell = () => {
    alert('Sell order placed!');
  };

  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <button onClick={handleBuy} style={{ marginRight: '10px', padding: '10px 20px' }}>
        Buy
      </button>
      <button onClick={handleSell} style={{ padding: '10px 20px' }}>
        Sell
      </button>
    </div>
  );
};

export default TradeButtons;
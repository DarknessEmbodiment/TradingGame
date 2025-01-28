// src/App.tsx
import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import './App.css';

type Candle = {
  x: Date;
  y: [number, number, number, number];
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT'];
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

const App: React.FC = () => {
  const [series, setSeries] = useState<Candle[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [balance, setBalance] = useState(1000);
  const [position, setPosition] = useState<{ type: 'long' | 'short'; entryPrice: number; liquidationPrice: number; quantity: number } | null>(null);
  const [leverage, setLeverage] = useState(10);
  const [symbol, setSymbol] = useState('BTCUSDT');

  const fetchRandomData = async () => {
    const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const randomInterval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    setSymbol(randomSymbol);
    
    const endTime = Date.now();
    const limit = 100;
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${randomSymbol}&interval=${randomInterval}&limit=${limit}&endTime=${endTime}`
    );

    const data: Candle[] = response.data.map((kline: any[]) => ({
      x: new Date(kline[0]),
      y: [parseFloat(kline[1]), parseFloat(kline[2]), parseFloat(kline[3]), parseFloat(kline[4])],
    }));

    setSeries(data);
    setCurrentStep(Math.floor(data.length * 0.8)); // Start at 80% of historical data
  };

  const executeTrade = (type: 'long' | 'short') => {
    const currentPrice = series[currentStep]?.y[3];
    if (!currentPrice) return;

    const quantity = (balance * leverage) / currentPrice;
    const liquidationPrice = type === 'long' 
      ? currentPrice * (1 - 1 / leverage)
      : currentPrice * (1 + 1 / leverage);

    setPosition({
      type,
      entryPrice: currentPrice,
      liquidationPrice,
      quantity
    });
  };

  const checkLiquidation = (candle: Candle) => {
    if (!position) return false;

    const [low, high] = [candle.y[2], candle.y[1]];
    return position.type === 'long' 
      ? low <= position.liquidationPrice
      : high >= position.liquidationPrice;
  };

  const moveStep = () => {
    if (currentStep >= series.length - 1) return;

    const newStep = currentStep + 1;
    const currentCandle = series[newStep];

    if (position) {
      if (checkLiquidation(currentCandle)) {
        setBalance(0);
        setPosition(null);
      } else {
        const exitPrice = currentCandle.y[3];
        const pnl = position.type === 'long'
          ? (exitPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - exitPrice) * position.quantity;
        
        setBalance(b => Math.max(0, b + pnl));
      }
    }
    
    setCurrentStep(newStep);
  };

  const chartData = series.slice(0, currentStep + 1);
  const currentPrice = chartData[chartData.length - 1]?.y[3];

  return (
    <div className="App">
      <h1>Trading Simulator ({symbol})</h1>
      <div className="controls">
        <button onClick={fetchRandomData}>Random</button>
        <button onClick={moveStep} disabled={currentStep >= series.length - 1}>
          Next Step
        </button>
        <input
          type="number"
          value={leverage}
          onChange={(e) => setLeverage(Math.max(1, Number(e.target.value)))}
          min="1"
          style={{ width: '60px' }}
        />
        <span>x Leverage</span>
      </div>

      <div className="stats">
        <p>Balance: ${balance.toFixed(2)}</p>
        {position && (
          <p>
            Position: {position.type} @ ${position.entryPrice.toFixed(2)}
            <br />
            Liquidation: ${position.liquidationPrice.toFixed(2)}
          </p>
        )}
        {currentPrice && <p>Current Price: ${currentPrice.toFixed(2)}</p>}
      </div>

      <Chart
        options={{
          chart: { type: 'candlestick' },
          xaxis: { type: 'datetime' },
          title: { text: 'Historical Candles' }
        }}
        series={[{ data: chartData }]}
        type="candlestick"
        height={400}
      />

      <div className="trade-buttons">
        <button onClick={() => executeTrade('long')}>Buy Long</button>
        <button onClick={() => executeTrade('short')}>Sell Short</button>
      </div>
    </div>
  );
};

export default App;
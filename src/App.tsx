// src/App.tsx
import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import './App.css';

type Candle = {
  x: Date;
  y: [number, number, number, number];
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT'];
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];
const WINDOW_SIZE = 100;

const App: React.FC = () => {
  const [series, setSeries] = useState<Candle[]>([]);
  const [buffer, setBuffer] = useState<Candle[]>([]);
  const [balance, setBalance] = useState(1000);
  const [position, setPosition] = useState<{ 
    type: 'long' | 'short'; 
    entryPrice: number; 
    liquidationPrice: number; 
    quantity: number 
  } | null>(null);
  const [leverage, setLeverage] = useState(10);
  const [currentSymbol, setCurrentSymbol] = useState('BTCUSDT');
  const [currentInterval, setCurrentInterval] = useState('1m');
  const [nextStartTime, setNextStartTime] = useState(0);

  const intervalToMs = (interval: string) => {
    const num = parseInt(interval.slice(0, -1));
    const unit = interval.slice(-1);
    switch(unit) {
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid interval');
    }
  };

  const fetchRandomData = async () => {
    const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const randomInterval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    setCurrentSymbol(randomSymbol);
    setCurrentInterval(randomInterval);
    
    const startTime = Date.now() - Math.floor(Math.random() * (31536000000 - 2592000000) + 2592000000);
    
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${randomSymbol}&interval=${randomInterval}&limit=${WINDOW_SIZE}&startTime=${startTime}`
    );

    const data: Candle[] = response.data.map((kline: any[]) => ({
      x: new Date(kline[0]),
      y: [parseFloat(kline[1]), parseFloat(kline[2]), parseFloat(kline[3]), parseFloat(kline[4])],
    }));

    setSeries(data);
    setBuffer([]);
    
    const intervalMs = intervalToMs(randomInterval);
    const lastCandleTime = data[data.length -1].x.getTime();
    setNextStartTime(lastCandleTime + intervalMs);
  };

  const executeTrade = (type: 'long' | 'short') => {
    const currentPrice = series[series.length -1]?.y[3];
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

  const moveStep = async () => {
    if (buffer.length === 0) {
      try {
        const response = await axios.get(
          `https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=${currentInterval}&limit=${WINDOW_SIZE}&startTime=${nextStartTime}`
        );
        const newBuffer: Candle[] = response.data.map((kline: any[]) => ({
          x: new Date(kline[0]),
          y: [parseFloat(kline[1]), parseFloat(kline[2]), parseFloat(kline[3]), parseFloat(kline[4])],
        }));
        if (newBuffer.length === 0) return;
        
        setBuffer(newBuffer);
        const intervalMs = intervalToMs(currentInterval);
        const lastCandleTime = newBuffer[newBuffer.length -1].x.getTime();
        setNextStartTime(lastCandleTime + intervalMs);
      } catch (error) {
        console.error('Error fetching buffer:', error);
        return;
      }
    }

    if (buffer.length === 0) return;

    const newSeries = [...series.slice(1), buffer[0]];
    const newBuffer = buffer.slice(1);

    const currentCandle = newSeries[newSeries.length -1];
    const prevCandle = series[series.length -1];

    if (position) {
      if (checkLiquidation(currentCandle)) {
        setBalance(0);
        setPosition(null);
      } else {
        const exitPrice = currentCandle.y[3];
        const pnl = position.type === 'long'
          ? (exitPrice - prevCandle.y[3]) * position.quantity
          : (prevCandle.y[3] - exitPrice) * position.quantity;
        setBalance(b => Math.max(0, b + pnl));
      }
    }

    setSeries(newSeries);
    setBuffer(newBuffer);
  };

  const closePosition = () => {
    setPosition(null);
  };

  const currentPrice = series[series.length -1]?.y[3];

  return (
    <div className="App">
      <h1>Trading Simulator ({currentSymbol})</h1>
      <div className="controls">
        <button onClick={() => fetchRandomData()}>Random</button>
        <button onClick={moveStep}>Next Step</button>
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
          chart: { type: 'candlestick',
            animations: {
              dynamicAnimation: {
                // Makes bars move like a snake
                // but makes the horizontal transition bad
                enabled: false,
              }
            }
           },
          xaxis: { type: 'datetime' },
          title: { text: 'Historical Candles' },
        }}
        series={[{ data: series }]}
        type="candlestick"
        height={400}
      />

      <div className="trade-buttons">
        <button onClick={() => executeTrade('long')}>Buy Long</button>
        <button onClick={() => executeTrade('short')}>Sell Short</button>
        <button onClick={closePosition} disabled={!position}>
          Close Position
        </button>
      </div>
    </div>
  );
};

export default App;
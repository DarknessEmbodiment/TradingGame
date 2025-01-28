// src/utils/binanceApi.ts
import axios from 'axios';

export const fetchCandlestickData = async (symbol: string, interval: string) => {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}`;
  const response = await axios.get(url);
  return response.data.map((kline: any[]) => ({
    x: new Date(kline[0]),
    y: [parseFloat(kline[1]), parseFloat(kline[2]), parseFloat(kline[3]), parseFloat(kline[4])],
  }));
};
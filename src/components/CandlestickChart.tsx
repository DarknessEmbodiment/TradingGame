// src/components/CandlestickChart.tsx
import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { fetchCandlestickData } from '../utils/binanceApi';
import { ApexOptions } from 'apexcharts';

const CandlestickChart: React.FC = () => {
  const [series, setSeries] = useState<{ data: { x: Date; y: number[] }[] }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchCandlestickData('BTCUSDT', '1h'); // Fetch BTC/USDT 1-hour candlesticks
      setSeries([{ data }]);
    };
    loadData();
  }, []);

  const options = {
    chart: {
      type: 'candlestick',
    },
    title: {
      text: 'BTC/USDT Candlestick Chart',
      align: 'left',
    },
    xaxis: {
      type: 'datetime',
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <div>
      <Chart options={options as ApexOptions} series={series} type="candlestick" height={350} />
    </div>
  );
};

export default CandlestickChart;
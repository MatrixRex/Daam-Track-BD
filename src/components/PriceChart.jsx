import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PriceChart({ items = [], colors = [] }) {
  const { runQuery, loading: engineLoading } = useDuckDB();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Data for all items when items array changes
  useEffect(() => {
    const fetchAllData = async () => {
      if (!items.length || engineLoading) return;

      setLoading(true);
      try {
        // Fetch data for each item
        const allData = await Promise.all(
          items.map(async (item) => {
            const result = await runQuery(`
              SELECT date, price 
              FROM 'data.parquet' 
              WHERE name = '${item.name}' 
              ORDER BY date ASC
            `);
            return {
              name: item.name,
              data: result.map(r => ({
                date: r.date,
                price: Number(r.price),
                dateShort: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                fullDate: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              }))
            };
          })
        );

        // Merge all data by date for the chart
        // Create a map of date -> { date, item1Price, item2Price, ... }
        const dateMap = new Map();

        allData.forEach(({ name, data }) => {
          data.forEach(point => {
            if (!dateMap.has(point.date)) {
              dateMap.set(point.date, {
                date: point.date,
                dateShort: point.dateShort,
                fullDate: point.fullDate
              });
            }
            // Use item name as key for the price (sanitize for recharts)
            dateMap.get(point.date)[name] = point.price;
          });
        });

        // Convert map to sorted array
        const mergedData = Array.from(dateMap.values())
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setChartData(mergedData);
      } catch (err) {
        console.error("Chart Query Failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [items, engineLoading]);

  // Calculate stats for each item
  const stats = useMemo(() => {
    if (!chartData.length || !items.length) return [];

    return items.map((item, index) => {
      const prices = chartData
        .map(d => d[item.name])
        .filter(p => p !== undefined);

      if (!prices.length) return null;

      const current = prices[prices.length - 1];
      const prev = prices.length > 1 ? prices[prices.length - 2] : current;
      const change = current - prev;

      return {
        name: item.name,
        color: colors[index % colors.length]?.stroke || '#3B82F6',
        current,
        min: Math.min(...prices),
        max: Math.max(...prices),
        change
      };
    }).filter(Boolean);
  }, [chartData, items, colors]);

  // --- RENDER ---

  // Loading State
  if (loading || engineLoading) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-sm text-gray-400">Loading Price History...</span>
      </div>
    );
  }

  // No Data State
  if (chartData.length === 0) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-red-400">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm">No history found for selected items.</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      {/* Header with Stats */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Price Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {items.length} item{items.length > 1 ? 's' : ''} • Last 90 days
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-xs font-medium text-slate-600 max-w-[100px] truncate">
                {stat.name}
              </span>
              <span className="text-sm font-bold text-slate-900">৳{stat.current}</span>
              <span className={`text-xs font-medium ${stat.change > 0 ? 'text-red-500' : stat.change < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                {stat.change > 0 ? '▲' : stat.change < 0 ? '▼' : ''}
                {Math.abs(stat.change)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* The Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              {items.map((item, index) => (
                <linearGradient
                  key={item.name}
                  id={`color-${index}`}
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[index % colors.length]?.fill || '#3B82F6'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[index % colors.length]?.fill || '#3B82F6'}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="dateShort"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              unit="৳"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
              formatter={(value, name) => [`৳${value}`, name]}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
            />
            {items.map((item, index) => (
              <Line
                key={item.name}
                type="monotone"
                dataKey={item.name}
                name={item.name}
                stroke={colors[index % colors.length]?.stroke || '#3B82F6'}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, fill: 'white' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Min/Max Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-3 justify-center">
          {stats.map((stat) => (
            <div key={stat.name} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-xs text-slate-500 truncate max-w-[100px]">{stat.name}</span>
              <span className="text-xs text-green-600">L:৳{stat.min}</span>
              <span className="text-xs text-red-600">H:৳{stat.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
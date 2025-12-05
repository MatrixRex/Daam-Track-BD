import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useDuckDB } from '../hooks/useDuckDB';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PriceChart({ item }) {
  const { runQuery, loading: engineLoading } = useDuckDB();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Data when item changes
  useEffect(() => {
    const fetchData = async () => {
      if (!item || engineLoading) return;

      setLoading(true);
      try {
        // The SQL Query
        // DuckDB automatically downloads ONLY the bytes for this item
        const result = await runQuery(`
          SELECT date, price 
          FROM 'data.parquet' 
          WHERE name = '${item.name}' 
          ORDER BY date ASC
        `);

        // Format dates for the Chart
        const formatted = result.map(r => ({
          ...r,
          // Convert BigInt price to Number for Recharts
          price: Number(r.price),
          // Short date for X-Axis (e.g. "24 Oct")
          dateShort: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          // Full date for Tooltip (e.g. "24 October 2024")
          fullDate: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        }));

        setData(formatted);
      } catch (err) {
        console.error("Chart Query Failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [item, engineLoading]);

  // 2. Calculate Stats (Min, Max, Change)
  const stats = useMemo(() => {
    if (!data.length) return null;
    // Convert BigInt to Number (DuckDB returns BigInt for integers)
    const prices = data.map(d => Number(d.price));
    const current = prices[prices.length - 1];
    const prev = prices.length > 1 ? prices[prices.length - 2] : current;
    const change = current - prev;

    return {
      current,
      min: Math.min(...prices),
      max: Math.max(...prices),
      change
    };
  }, [data]);

  // --- RENDER ---

  // Loading State
  if (loading || engineLoading) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-sm text-gray-400">Loading Price History...</span>
      </div>
    );
  }

  // No Data State
  if (data.length === 0) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 text-red-400">
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm">No history found for this item.</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Header Stats */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Price History</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-slate-900">৳{stats.current}</span>
            <span className={`text-sm font-medium ${stats.change > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.change > 0 ? '▲' : stats.change < 0 ? '▼' : ''} {Math.abs(stats.change)} Tk
            </span>
          </div>
        </div>

        {/* Min/Max Pills */}
        <div className="flex gap-2 text-xs font-medium">
          <div className="px-2 py-1 bg-slate-50 rounded text-slate-500">
            Low: <span className="text-slate-900">৳{stats.min}</span>
          </div>
          <div className="px-2 py-1 bg-slate-50 rounded text-slate-500">
            High: <span className="text-slate-900">৳{stats.max}</span>
          </div>
        </div>
      </div>

      {/* The Chart */}
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
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
              domain={['auto', 'auto']} // Auto-scale to fit data
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(label, p) => p[0]?.payload.fullDate || label}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
export default function AccuracyChart({
  history,
}: {
  history: { day: string; accuracy: number }[];
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Accuracy this week: ${history.map((d) => `${d.day} ${d.accuracy}%`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={history}
          margin={{ top: 15, right: 12, bottom: 0, left: -25 }}
        >
          <defs>
            <linearGradient id="purple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8161e8" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#8161e8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f0eef4" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#96939e" }}
            dy={10}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#96939e" }}
            unit="%"
          />
          <Tooltip />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="accuracy"
            stroke="#8261e6"
            strokeWidth={3}
            fill="url(#purple)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

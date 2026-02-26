import { memo, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  Present: "#198754",
  "Half Day": "#0dcaf0",
  Leave: "#ffc107",
  Weekend: "#6c757d",
};

const MonthlySummaryChart = memo(({ summary, title }) => {
  const data = useMemo(
    () =>
      [
        { name: "Present", value: summary.present },
        { name: "Half Day", value: summary.halfDay },
        { name: "Leave", value: summary.leave },
        { name: "Weekend", value: summary.weekend },
      ].filter(d => d.value > 0),
    [summary]
  );

  return (
    <>
      <h6 className="mb-2">{title}</h6>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={55}
            outerRadius={85}
            label
          >
            {data.map(d => (
              <Cell key={d.name} fill={COLORS[d.name]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
});

export default MonthlySummaryChart;

import { useMemo } from "react";
import { Card } from "react-bootstrap";
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
  Leave: "#ffc107",
  Weekend: "#6c757d",
  Payable: "#0d6efd",
};

const WeeklySummaryByEmployee = ({ summary, isAdmin }) => {
  const data = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Present", value: summary.present || 0 },
      { name: "Leave", value: summary.leave || 0 },
      { name: "Weekend", value: summary.weekend || 0 },
      { name: "Payable", value: summary.payableDays || 0 },
    ].filter(d => d.value > 0);
  }, [summary]);

  if (!summary) return null;

  return (
    <Card className="p-3">
      <h6>{isAdmin ? "Overall Weekly Summary" : "My Weekly Summary"}</h6>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
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
    </Card>
  );
};

export default WeeklySummaryByEmployee;

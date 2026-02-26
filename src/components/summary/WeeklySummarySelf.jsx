import { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import WeeklySummaryByEmployee from "../WeeklySummaryByEmployee";
import { attendanceApi } from "../../services/api";

const WeeklySummarySelf = ({ weekStart }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    attendanceApi
      .getMyWeeklySummary(weekStart)
      .then(res => setSummary(res.data.data))
      .catch(() => setSummary(null));
  }, [weekStart]);

  if (!summary) return null;

  return (
    <Card className="mt-3 p-3">
      <h5>My Weekly Summary</h5>
      <WeeklySummaryByEmployee summary={summary} isAdmin={false} />
    </Card>
  );
};

export default WeeklySummarySelf;

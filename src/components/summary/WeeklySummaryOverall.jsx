import { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import WeeklySummaryByEmployee from "../WeeklySummaryByEmployee";
import { attendanceApi } from "../../services/api";

const WeeklySummaryOverall = ({ weekStart }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    attendanceApi
      .getAllWeeklySummary(weekStart)
      .then(res => setSummary(res.data.data.overallSummary))
      .catch(() => setSummary(null));
  }, [weekStart]);

  if (!summary) return null;

  return (
    <Card className="mt-3 p-3">
      <h5>Overall Weekly Summary</h5>
      <WeeklySummaryByEmployee summary={summary} isAdmin />
    </Card>
  );
};

export default WeeklySummaryOverall;


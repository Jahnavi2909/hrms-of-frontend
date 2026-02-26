import { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import MonthlySummaryByEmployee from "../MonthlySummaryByEmployee";
import { attendanceApi } from "../../services/api";

const MonthlySummarySelf = ({ employeeId }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const d = new Date();
    attendanceApi
      .getMonthlySummaryByEmployee(employeeId, d.getFullYear(), d.getMonth() + 1)
      .then(res => setSummary(res.data.data))
      .catch(() => setSummary(null));
  }, [employeeId]);

  if (!summary) return null;

  return (
    <Card className="mt-3 p-3">
      <h5>My Monthly Summary</h5>
      <MonthlySummaryByEmployee summary={summary} isAdmin={false} />
    </Card>
  );
};

export default MonthlySummarySelf;

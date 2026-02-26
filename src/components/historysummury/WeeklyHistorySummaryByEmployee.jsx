import { useEffect, useState } from "react";
import { Card, Spinner } from "react-bootstrap";
import { attendanceApi } from "../../services/api";

const WeeklySummaryByEmployee = ({ weekStart, employeeId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!weekStart || !employeeId) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await attendanceApi.getMyWeeklySummary(
          weekStart,
          employeeId
        );
        setSummary(res.data.data);
      } catch (err) {
        setError("Failed to load weekly summary");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [weekStart, employeeId]);

  if (loading)
    return (
      <Card className="p-4 text-center">
        <Spinner animation="border" />
      </Card>
    );

  if (error) return <p className="text-danger">{error}</p>;
  if (!summary) return null;

  const {
    workingDays = 0,
    present = 0,
    absent = 0,
    leave = 0,
    halfDay = 0,
    holidays = 0,
    weekends = 0,
    late = 0,
    payableDays = 0,
  } = summary;

  return (
    <Card className="shadow-sm h-100">
      <Card.Header>
        <strong>Weekly Summary</strong>
      </Card.Header>
      <Card.Body>
        <div>Working Days: <strong>{workingDays}</strong></div>
        <div className="text-success">Present: {present}</div>
        <div className="text-danger">Absent: {absent}</div>
        <div className="text-warning">Leave: {leave}</div>
        <div className="text-info">Half Day: {halfDay}</div>
        <div className="text-primary">Holidays: {holidays}</div>
        <div className="text-secondary">Weekends: {weekends}</div>
        <div className="text-dark">Late Marks: {late}</div>
        <hr />
        <div>
          Payable Days: <strong>{payableDays}</strong>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WeeklySummaryByEmployee;
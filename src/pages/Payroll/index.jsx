import { useEffect, useState } from "react";
import {
  Card,
  Form,
  Table,
  Button,
  Alert,
  Collapse,
  Badge
} from "react-bootstrap";
import { FaMoneyBillWave, FaDownload, FaLock } from "react-icons/fa";
import { employeeApi, payrollApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

/* =======================
   PAYROLL GENERATE FORM
======================= */
const PayrollGenerateForm = ({ refresh }) => {
  const { user } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user.role === "ROLE_ADMIN" || user.role === "ROLE_HR") {
      employeeApi.getAllEmployee().then(res => {
        setEmployees(res.data?.data || []);
      });
    }
  }, [user.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setError(null);

    if (!employeeId || !month || !year) {
      setError("Select employee, month and year");
      return;
    }

    try {
      await payrollApi.generate(employeeId, year, month);
      setMsg("Payroll generated successfully");
      setIsOpen(false);
      refresh(year, month);
    } catch {
      setError("Failed to generate payroll");
    }
  };

  return (
    <Card className="mt-4">
      <div className="d-flex justify-content-between align-items-center">
        <Card.Header>Generate Payroll</Card.Header>
        <Button className="me-3 mt-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "Close" : "Generate"}
        </Button>
      </div>

      <Card.Body>
        {msg && <Alert variant="success">{msg}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Collapse in={isOpen}>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Employee</Form.Label>
              <Form.Select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} ({emp.employeeId})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Month</Form.Label>
              <Form.Control
                type="month"
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  setYear(y);
                  setMonth(m);
                }}
              />
            </Form.Group>

            <Button type="submit">Generate Payroll</Button>
          </Form>
        </Collapse>
      </Card.Body>
    </Card>
  );
};

/* =======================
        PAYROLL PAGE
======================= */
const Payroll = () => {
  const { user } = useAuth();

  const [payrolls, setPayrolls] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [message, setMessage] = useState(null);

  const loadPayrolls = async (y = year, m = month) => {
    try {
      const res = await payrollApi.getByMonth(y, m);
      setPayrolls(res.data?.data || []);
    } catch {
      setMessage("Failed to load payrolls");
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

  const downloadPayslip = async (id) => {
    const res = await payrollApi.downloadPayslip(id);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Payslip.pdf";
    link.click();
  };

  const lockPayroll = async (id) => {
    await payrollApi.lock(id);
    loadPayrolls();
  };

  return (
    <div>
      <h2 className="mb-3">
        <FaMoneyBillWave /> Payroll
      </h2>

      {(user.role === "ROLE_ADMIN" || user.role === "ROLE_HR") && (
        <PayrollGenerateForm refresh={loadPayrolls} />
      )}

      {message && <Alert variant="danger">{message}</Alert>}

      <Card className="mt-4">
        <Card.Header>Payroll Records</Card.Header>
        <Card.Body className="table-responsive">
          <Table bordered hover>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th>Attendance</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {payrolls.length ? payrolls.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.employee.firstName} {p.employee.lastName}
                    <br />
                    <small>{p.employee.employeeId}</small>
                  </td>

                  <td>{p.month}/{p.year}</td>

                  <td>
                    Present: {p.presentDays}/{p.totalWorkingDays}
                    <br />
                    Paid Leave: {p.paidLeaveDays}
                  </td>

                  <td>₹{p.grossSalary.toFixed(2)}</td>

                  <td>
                    PF: ₹{p.pfAmount}<br />
                    PT: ₹{p.professionalTax}<br />
                    <strong>Total: ₹{p.totalDeductions}</strong>
                  </td>

                  <td>
                    <strong>₹{p.netSalary.toFixed(2)}</strong>
                  </td>

                  <td>
                    <Badge bg={p.status === "LOCKED" ? "secondary" : "info"}>
                      {p.status}
                    </Badge>
                  </td>

                  <td className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => downloadPayslip(p.id)}
                    >
                      <FaDownload />
                    </Button>

                    {(user.role === "ROLE_ADMIN" || user.role === "ROLE_HR") &&
                      p.status !== "LOCKED" && (
                        <Button
                          size="sm"
                          variant="dark"
                          onClick={() => lockPayroll(p.id)}
                        >
                          <FaLock />
                        </Button>
                      )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    No payroll data
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Payroll;

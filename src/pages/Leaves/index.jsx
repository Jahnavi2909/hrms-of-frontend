import { useEffect, useState } from "react";
import { Card, Form, Table, Button, Alert, Collapse } from "react-bootstrap";
import { leaveApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import "./style.css";
import { useNavigate } from "react-router-dom";

const LeaveApplyForm = ({ refresh }) => {
  const [leaveType, setLeaveType] = useState("SICK");
  const [startDate, setFromDate] = useState("");
  const [endDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dateError, setDateError] = useState(null);

  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDateError(null);

    if (!startDate || !endDate) {
      setError("Select both From and To dates");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setDateError("To date cannot be before From date");
      return;
    }

    const payload = {
      employeeId: user.employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    };

    try {
      await leaveApi.apply(payload);
      setMsg("Leave applied successfully!");
      refresh();
      setIsOpen(false);
    } catch (e) {
      setError("Failed to apply leave");
    }
  };

  return (
    <Card className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Card.Header>Apply Leave</Card.Header>
        <Button
          type="button"
          variant="primary"
          style={{ marginRight: "20px", marginTop: "10px" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Close Form" : "Apply Leave"}
        </Button>
      </div>
      <Card.Body>
        {msg && <Alert variant="success">{msg}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Collapse in={isOpen}>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type</Form.Label>
              <Form.Select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
              >
                <option value="SICK">Sick Leave</option>
                <option value="CASUAL">Casual Leave</option>
                <option value="ANNUAL">Annual Leave</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>From</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setToDate("");
                  setDateError(null);
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>To</Form.Label>
              <Form.Control
                type="date"
                min={startDate || new Date().toISOString().split("T")[0]}
                value={endDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateError(null);
                }}
                isInvalid={!!dateError}
                required
              />
              <Form.Control.Feedback type="invalid">
                {dateError}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </Form.Group>

            <Button type="submit">Apply</Button>
          </Form>
        </Collapse>
      </Card.Body>
    </Card>
  );
};

const Leaves = () => {
  const [leaveData, setLeaveData] = useState([]);
  const [message, setMessage] = useState(null);
  const [filters, setFilters] = useState({
    name: "",
    code: "",
    status: "ALL",
    date: "",
  });



  const { user } = useAuth();
  const employeeId = user?.employeeId;
  const navigate = useNavigate();

  const [expandedLeaveId, setExpandedLeaveId] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const toggleExpand = (leaveId) => {
    setExpandedLeaveId(prev => (prev === leaveId ? null : leaveId));
  };


  const loadLeaves = async () => {
    try {
      let res;

      if (user.role === "ROLE_ADMIN" || user.role === "ROLE_MANAGER" || user.role === "ROLE_HR") {
        res = await leaveApi.getAll();
      } else {
        res = await leaveApi.getByEmployee(employeeId);
      }

      setLeaveData(res?.data?.data ?? []);
    } catch (err) {
      console.error("Error loading leaves:", err);
      setLeaveData([]);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleAction = async (leaveId, actionType) => {
    const payload = {
      action: actionType,
      comment: `${actionType} by ${user.firstName}`,
      actorEmployeeId: user.employeeId,
    };

    try {
      await leaveApi.actOnLeave(leaveId, payload);
      setMessage(`Leave ${actionType.toLowerCase()} successfully`);
      loadLeaves();
    } catch (err) {
      console.error("Action error:", err);
      setMessage("Failed to perform action");
    }
  };

  const filteredLeaves = leaveData.filter((l) => {
    const isAdminView =
      user.role === "ROLE_ADMIN" ||
      user.role === "ROLE_MANAGER" ||
      user.role === "ROLE_HR";

    const matchesName = isAdminView
      ? l.employeeName
        .toLowerCase()
        .includes(filters.name.toLowerCase())
      : true;

    const matchesCode = isAdminView
      ? l.employeeCode
        .toLowerCase()
        .includes(filters.code.toLowerCase())
      : true;

    const matchesStatus =
      filters.status === "ALL" || l.status === filters.status;

    const matchesDate = filters.date
      ? new Date(filters.date) >= new Date(l.startDate) &&
      new Date(filters.date) <= new Date(l.endDate)
      : true;

    return matchesName && matchesCode && matchesStatus && matchesDate;
  });

  return (
    <div>

      {/* DESKTOP FILTERS */}
      <div className="filter-section">
        <h2>
          {(user.role === "ROLE_ADMIN" || user.role === "ROLE_MANAGER" || user.role === "ROLE_HR")
            ? "Leaves Management"
            : "My Leaves"}
        </h2>

        <div className="d-none d-md-flex gap-2 mb-3 justify-content-end flex-nowrap desktop-filter">

          {(user.role === "ROLE_ADMIN" ||
            user.role === "ROLE_MANAGER" ||
            user.role === "ROLE_HR") && (
              <>
                <Form.Control
                  type="text"
                  className="deskop-filter-input"
                  placeholder="Employee Name"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                />

                <Form.Control
                  type="text"
                  placeholder="Employee Code"
                  className="deskop-filter-input"
                  value={filters.code}
                  onChange={(e) =>
                    setFilters({ ...filters, code: e.target.value })
                  }
                />
              </>
            )}

          <Form.Control
            type="date"
            className="deskop-filter-input"
            value={filters.date}
            onChange={(e) =>
              setFilters({ ...filters, date: e.target.value })
            }
          />


          <Form.Select
            value={filters.status}
            className="deskop-filter-input"
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>

        </div>

        {/* MOBILE FILTER */}
        <div className="d-md-none mb-3">

          <Button
            variant="outline-light"
            className="w-100 mb-2"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            {mobileFilterOpen ? "Hide Filters ▲" : "Show Filters ▼"}
          </Button>

          <Collapse in={mobileFilterOpen}>
            <div className="mobile-filter-card p-3">

              {(user.role === "ROLE_ADMIN" ||
                user.role === "ROLE_MANAGER" ||
                user.role === "ROLE_HR") && (
                  <>
                    <Form.Group className="mb-3 text-white">
                      <Form.Label>Employee Name</Form.Label>
                      <Form.Control
                        placeholder="Search Name"
                        type="text"
                        value={filters.name}
                        onChange={(e) =>
                          setFilters({ ...filters, name: e.target.value })
                        }
                      />
                    </Form.Group>

                    <Form.Group className="mb-3 text-white">
                      <Form.Label>Employee Code</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search Employee Code"
                        value={filters.code}
                        onChange={(e) =>
                          setFilters({ ...filters, code: e.target.value })
                        }
                      />
                    </Form.Group>
                  </>
                )}

              <Form.Group className="mb-3">
                <Form.Label className="text-white">Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="text-white">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.date}
                  onChange={(e) =>
                    setFilters({ ...filters, date: e.target.value })
                  }
                />
              </Form.Group>

            </div>
          </Collapse>
        </div>
      </div>

      {(user.role !== "ROLE_ADMIN" && user.role !== "ROLE_HR" && user.role !== "ROLE_MANAGER") && (
        <LeaveApplyForm refresh={loadLeaves} />
      )}
      {message && <Alert variant="success">{message}</Alert>}

      <Card className="mt-4">
        <Card.Header>Leave Records</Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  {(user.role === "ROLE_ADMIN" || user.role === "ROLE_MANAGER" || user.role === "ROLE_HR") && <th>Employee</th>}
                  <th>Type</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  {(user.role === "ROLE_MANAGER" || user.role === "ROLE_HR") && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length ? filteredLeaves.map((l) => (
                  <>
                    {/* MAIN ROW */}
                    <tr
                      key={l.id}
                      onClick={() => toggleExpand(l.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {(user.role === "ROLE_ADMIN" || user.role === "ROLE_MANAGER" || user.role === "ROLE_HR") && (
                        <td>
                          {l.employeeName}<br />
                          <small>{l.employeeCode}</small>
                        </td>
                      )}

                      <td>{l.leaveType}</td>

                      <td>
                        <span className={`badge bg-${l.status === "APPROVED"
                          ? "success"
                          : l.status === "REJECTED"
                            ? "danger"
                            : "warning"
                          }`}>
                          {l.status}
                        </span>
                      </td>

                      <td>{l.startDate}</td>
                      <td>{l.endDate}</td>
                      <td>{l.days}</td>

                      {(user.role === "ROLE_MANAGER" || user.role === "ROLE_HR") && (
                        <td>
                          {l.status === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                className="me-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(l.id, "APPROVE");
                                }}
                              >
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(l.id, "REJECT");
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          ) : "-"}
                        </td>
                      )}
                    </tr>

                    {/* COLLAPSE ROW */}
                    <tr>
                      <td colSpan="7" className="p-0">
                        <Collapse in={expandedLeaveId === l.id}>
                          <div className="mt-2 border-top pt-3 px-3 pb-3 bg-light">
                            <div className="mb-2">
                              <strong>Reason:</strong>
                              <div className="text-muted">{l.reason || "--"}</div>
                            </div>
                            <div className="mb-2">
                              <strong>Applied On:</strong>
                              <div className="text-muted">{l.appliedOn || "--"}</div>
                            </div>

                            <div className="mb-2">
                              <strong>Comment:</strong>
                              <div className="text-muted">{l.managerComment || "--"}</div>
                            </div>
                            <div className="mb-2">
                              <strong>Action By:</strong>
                              <div className="text-muted">{l.managerComment || "--"}</div>
                            </div>

                            <div className="d-flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/employee/${l.employeeId}/monthly-leaves`);
                                }}
                              >
                                View All Leaves
                              </Button>

                              {(user.role === "ROLE_MANAGER" ||
                                user.role === "ROLE_HR") &&
                                l.status === "PENDING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(l.id, "APPROVE");
                                      }}
                                    >
                                      Approve
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(l.id, "REJECT");
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                            </div>
                          </div>

                        </Collapse>
                      </td>
                    </tr>
                  </>
                )) : (
                  <tr>
                    <td colSpan="7" className="text-center">No records found</td>
                  </tr>
                )}
              </tbody>

            </Table>
          </div>

          <div className="leave-mobile-list">
            {filteredLeaves.map((l) => (
              <div
                key={l.id}
                className="leave-card"
                onClick={() => toggleExpand(l.id)}
              >
                {(user.role === "ROLE_ADMIN" || user.role === "ROLE_MANAGER" || user.role === "ROLE_HR") && (
                  <div className="field">
                    <div className="label">Employee</div>
                    <div className="value">
                      {l.employeeName} ({l.employeeCode})
                    </div>
                  </div>
                )}

                <div className="field">
                  <div className="label">Leave Type</div>
                  <div className="value">{l.leaveType}</div>
                </div>

                <div className="field">
                  <div className="label">Status</div>
                  <span
                    className={`badge bg-${l.status === "APPROVED"
                      ? "success"
                      : l.status === "REJECTED"
                        ? "danger"
                        : "warning"
                      }`}
                  >
                    {l.status}
                  </span>
                </div>

                <div className="field">
                  <div className="label">From</div>
                  <div className="value">{l.startDate}</div>
                </div>

                <div className="field">
                  <div className="label">To</div>
                  <div className="value">{l.endDate}</div>
                </div>

                <div className="field">
                  <div className="label">Days</div>
                  <div className="value">{l.days}</div>
                </div>

                {/* COLLAPSE SECTION */}
                <Collapse in={expandedLeaveId === l.id}>
                  <div>
                    <div className="text-end text-muted small">
                      {expandedLeaveId === l.id ? "Tap to collapse ▲" : "Tap to expand ▼"}
                    </div>

                    <div className="mt-3 border-top pt-2">

                      <div className="mb-2">
                        <strong>Reason:</strong>
                        <div className="text-muted">{l.reason || "--"}</div>
                      </div>

                      <div className="mb-2">
                        <strong>applied On:</strong>
                        <div className="text-muted">{l.appliedOn || "--"}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Comment:</strong>
                        <div className="text-muted">{l.managerComment || "--"}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Action By:</strong>
                        <div className="text-muted">{l.managerComment || "--"}</div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="w-100 mb-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employee/${l.employeeId}/monthly-leaves`);
                        }}
                      >
                        View All Leaves
                      </Button>

                      {(
                        user.role === "ROLE_MANAGER" ||
                        user.role === "ROLE_HR") &&
                        l.status === "PENDING" && (
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              className="w-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(l.id, "APPROVE");
                              }}
                            >
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="danger"
                              className="w-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(l.id, "REJECT");
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                </Collapse>
              </div>
            ))}
          </div>

        </Card.Body>
      </Card>
    </div>
  );
};

export default Leaves;

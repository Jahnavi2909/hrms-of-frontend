
import {
  Button, Card, Col, Container, Row, Spinner, Tab, Tabs, Collapse
} from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaCalendarAlt, FaChartLine, FaUsers, FaEdit, FaTrash, FaUserPlus,
  FaMapMarkerAlt,
  FaRegCalendarCheck
} from "react-icons/fa";
import { attendanceApi, employeeApi, holidayApi, leaveApi, taskApi } from "../../services/api";
import EmployeeForm from "../Employee/EmployeeForm";
import "./style.css";
import useAutoCheckout from "../../contexts/layout/AutoCheckout";
import useGeolocation from "../../hooks/useGeolocation";


const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getLocation, loading: geoLoading } = useGeolocation();

  const isAdminOrHr = ["ROLE_ADMIN", "ROLE_HR"].includes(user?.role);
  const canCheckAttendance = ["ROLE_ADMIN", "ROLE_HR", "ROLE_MANAGER", "ROLE_EMPLOYEE", "ROLE_TEAM_LEADER"].includes(user?.role);
  const [workTimer, setWorkTimer] = useState("00:00:00");

  const CHECKIN_DISABLE_MINUTES = 5;

  const [checkOutDisabled, setCheckOutDisabled] = useState(false);
  const [checkOutCooldownLeft, setCheckOutCooldownLeft] = useState(0);


  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0, presentToday: 0, onLeave: 0, departments: 0, absentToday: 0,
    c: ""
  });

  const [employeeDashboard, setEmployeeDashboard] = useState({
    checkIn: null,
    checkOut: null,
    leaveUsed: 0,
    leaveRemaining: 0,
    leaveTotal: 0,
    leaveApproved: 0,
    leaveRejected: 0
  });

  const [todayTasks, setTodayTasks] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [birthdayCount, setBirthdayCount] = useState(0);
  const [birthdays, setBirthdays] = useState([]);

  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);


  const [employees, setEmployees] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useAutoCheckout();

  useEffect(() => {
    if (!user) return;
    if (isAdminOrHr) loadAdminDashboard();
    if (canCheckAttendance) loadEmployeeDashboard();
  }, [user]);



  useEffect(() => {
    if (!employeeDashboard.checkIn || employeeDashboard.checkOut) {
      setCheckOutDisabled(false);
      setCheckOutCooldownLeft(0);
      return;
    }

    const checkInTime = new Date(employeeDashboard.checkIn).getTime();
    const cooldownMs = CHECKIN_DISABLE_MINUTES * 60 * 1000;
    const now = Date.now();

    const diff = now - checkInTime;

    if (diff < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - diff) / 1000);
      setCheckOutDisabled(true);
      setCheckOutCooldownLeft(remaining);
    } else {
      setCheckOutDisabled(false);
      setCheckOutCooldownLeft(0);
    }
  }, [employeeDashboard.checkIn, employeeDashboard.checkOut]);

  useEffect(() => {
    if (!checkOutDisabled) return;

    const interval = setInterval(() => {
      setCheckOutCooldownLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCheckOutDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [checkOutDisabled]);



  useEffect(() => {
    let interval;

    if (employeeDashboard.checkIn && !employeeDashboard.checkOut) {
      const checkInTime = new Date(employeeDashboard.checkIn);

      interval = setInterval(() => {
        const now = new Date();
        const diff = now - checkInTime;

        const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");

        setWorkTimer(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    }



    if (employeeDashboard.checkOut) {
      const checkIn = new Date(employeeDashboard.checkIn);
      const checkOut = new Date(employeeDashboard.checkOut);
      const diff = checkOut - checkIn;

      const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");

      setWorkTimer(`${hours}:${minutes}:${seconds}`);
    }

    return () => clearInterval(interval);
  }, [employeeDashboard.checkIn, employeeDashboard.checkOut]);


  const calculateLeaveStats = (leaves = [], totalLeaves = 20) => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;

    leaves.forEach(leave => {
      if (leave.status === "APPROVED") {
        approved += leave.days;
      } else if (leave.status === "REJECTED") {
        rejected += leave.days;
      } else if (leave.status === "PENDING") {
        pending += leave.days;
      }
    });

    return {
      approved,
      rejected,
      pending,
      used: approved,
      remaining: Math.max(totalLeaves - approved, 0),
      total: totalLeaves
    };
  };


  // Admin or HR Dashboard

  const loadAdminDashboard = async () => {
    try {
      const [empRes, todayRes] = await Promise.all([
        employeeApi.getAllEmployee(),
        attendanceApi.getTodayAttendance()
      ]);

      const empList = empRes.data?.data || [];
      const attendance = todayRes.data?.data || [];

      setEmployees(empList);


      const onlineCount = attendance.filter(
        a => a.attendanceStatus === "ONLINE"
      ).length;

      const presentCount = attendance.filter(
        a => a.attendanceStatus === "PRESENT"
      ).length;

      const halfDayCount = attendance.filter(
        a => a.attendanceStatus === "HALF_DAY"
      ).length;

      const presentToday =
        onlineCount > 0
          ? onlineCount
          : presentCount + halfDayCount;

      setStats({
        totalEmployees: empList.length,
        presentToday,
        presentLabel: onlineCount > 0 ? "Online Now" : "Present Today",
        // presentToday: attendance.filter(a => a.attendanceStatus === "ONLINE" || a.attendanceStatus === "PRESENT" || a.attendanceStatus === "HALF_DAY").length,
        absentToday: attendance.filter(a => a.attendanceStatus === "ABSENT").length,
        onLeave: attendance.filter(a => a.attendanceStatus === "ON_LEAVE").length,
        departments: new Set(empList.map(e => e.departmentName)).size
      });

    } catch (err) {
      console.error("Admin Dashboard Error:", err);
    }
    setLoading(false);
  };

  // Employee or Manager or Admin own dashboard
  const loadEmployeeDashboard = async () => {
    try {
      const employeeId = user.employeeId;
      if (!employeeId) return;

      const attendanceRes = await attendanceApi.getTodayAttendanceByEmployee(employeeId);
      const leaveRes = await leaveApi.getByEmployee(employeeId);
      const taskRes = await taskApi.getByEmployee(employeeId);

      const today = attendanceRes.data?.data;
      const leaves = leaveRes.data?.data || [];
      const tasks = taskRes.data?.data || [];

      // ---- TODAY FILTER ----

      const todayDate = new Date().toISOString().split("T")[0];
      const todayCheckIn = today?.checkInTime
        ? new Date(`${todayDate}T${today.checkInTime}`)
        : null;

      const todayCheckOut = today?.checkOutTime
        ? new Date(`${todayDate}T${today.checkOutTime}`)
        : null;
      const todayTaskList = tasks.filter(
        task => task.dueDate === todayDate
      );

      setTodayTasks(todayTaskList);

      const leaveStats = calculateLeaveStats(leaves, 20);

      setEmployeeDashboard({
        checkIn: todayCheckIn || null,
        checkOut: todayCheckOut || null,
        leaveUsed: leaveStats.used,
        leaveRemaining: leaveStats.remaining,
        leaveTotal: leaveStats.total,
        leaveApproved: leaveStats.approved,
        leaveRejected: leaveStats.rejected
      });

    } catch (err) {
      console.error("Employee Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await holidayApi.getAllHolidays();
        console.log("Holidays API response:", res.data);
        setHolidays(res.data || []);
      } catch (err) {
        console.error("Failed to load holidays", err);
      }
    };

    fetchHolidays();
  }, []);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const countRes = await employeeApi.getBirthdayCount(selectedMonth);
        const listRes = await employeeApi.getMonthlyBirthdays(selectedMonth, true);

        setBirthdayCount(countRes.data || 0);
        setBirthdays(listRes.data || []);
      } catch (err) {
        console.error("Failed to load birthdays", err);
      }
    };

    fetchBirthdays();
  }, [selectedMonth]);

  // Check-in / Check-out 
  const handleCheckIn = async () => {
    try {
      const location = await getLocation();

      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: "Current Location"
      };

      await attendanceApi.checkIn(user.employeeId, payload);

      await loadEmployeeDashboard();
      if (isAdminOrHr) await loadAdminDashboard();

    } catch (err) {
      console.error("Check-in error:", err);

      if (err?.response?.data?.message) {
        alert(err.response.data.message);
        return;
      }

      if (err?.code === 1) {
        alert("Location permission denied. Please enable GPS.");
        return;
      }

      alert("Check-in failed. Please try again.");
    }
  };


  const handleCheckOut = async () => {
    try {
      await attendanceApi.checkOut(user.employeeId);
      await loadEmployeeDashboard();
      if (isAdminOrHr) await loadAdminDashboard();
    } catch (err) {
      console.error(err);
      alert("Check-out failed");
    }
  };



  // Handle Edit or Delete Employee

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setOpenForm(true);
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await employeeApi.delete(id);
      setEmployees(employees.filter(e => e.id !== id));
      alert("Employee deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete employee.");
    }
  };

  const holidayMiniCard = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get upcoming holidays
    const upcoming = holidays
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .filter(h => {
        const holidayDate = new Date(h.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate >= today;
      });

    return (
      <Card className="attendance-card mb-4 animated-card h-100 d-flex flex-column">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="text-muted mb-0">
              <FaRegCalendarCheck className="me-2" />
              Upcoming Holidays
            </h6>

            {isAdminOrHr && (
              <Button size="sm" variant="outline-primary" onClick={() => navigate("/holidays")}>
                Manage
              </Button>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="text-muted small text-center">No upcoming holidays</div>
          ) : (
            <ul className="list-unstyled mb-0">
              {upcoming.map(h => (
                <li
                  key={h.id}
                  className="d-flex justify-content-between align-items-center py-2 border-bottom small"
                >
                  <span className="fw-semibold">{h.name}</span>
                  <span className="text-muted">{new Date(h.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}

          {!isAdminOrHr && upcoming.length > 4 && (
            <div className="text-center mt-2">
              <Button size="sm" variant="link" onClick={() => navigate("/holidays")}>
                View all holidays
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };


  const birthdayMiniCard = () => {

    return (
      <Card className="attendance-card mb-4 animated-card h-100 d-flex flex-column">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-muted mb-0">
                🎂 Birthdays
              </h6>

              <select
                className="form-select form-select-sm w-auto"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(Number(e.target.value))
                }
              >
                {[
                  "January", "February", "March", "April",
                  "May", "June", "July", "August",
                  "September", "October", "November", "December"
                ].map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <span className="badge bg-primary">
              {birthdayCount}
            </span>
          </div>

          {birthdays.length === 0 ? (
            <div className="text-muted small text-center">
              No upcoming birthdays 🎉
            </div>
          ) : (
            <ul className="list-unstyled mb-0">
              {birthdays.slice(0, 5).map(emp => {
                const empDate = emp.dateOfBirth?.slice(5, 10);

                return (
                  <li
                    key={emp.employeeId}
                    className="d-flex justify-content-between align-items-center py-2 border-bottom small"
                  >
                    <div>
                      <div className="fw-semibold">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <small className="text-muted">
                        {new Date(emp.dateOfBirth).toLocaleDateString()}
                      </small>
                    </div>

                    {emp.todayBirthday ? (
                      <span className="badge bg-success">Today 🎉</span>
                    ) : (
                      <span className="text-muted">
                        {emp.daysRemaining} days
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card.Body>
      </Card>
    );
  };


  // Admin or HR View

  const renderAdminView = () => (
    <>
      {canCheckAttendance && !(user?.role === "ROLE_ADMIN") && (
        <Card className="attendance-card mb-4">
          <Card.Body className="text-center">

            <h6 className="text-muted mb-1">Today's Work Duration</h6>

            <div className="work-timer">
              {employeeDashboard.checkIn ? workTimer : "00:00:00"}
            </div>

            <div className="mt-2 text-muted small">
              {employeeDashboard.checkIn
                ? `Checked in at ${new Date(employeeDashboard.checkIn).toLocaleTimeString()}`
                : "You haven't checked in yet"}
            </div>

            {employeeDashboard.checkOut && (
              <div className="text-muted small">
                Checked out at {new Date(employeeDashboard.checkOut).toLocaleTimeString()}
              </div>
            )}

            <div className="mt-4 d-flex justify-content-center gap-3">
              {!employeeDashboard.checkIn && (
                <Button
                  className="check-btn check-in"
                  onClick={handleCheckIn}
                  disabled={geoLoading}
                >
                  <FaMapMarkerAlt className="me-2" />
                  {geoLoading ? "Fetching Location..." : "✔ Check In"}
                </Button>


              )}

              {employeeDashboard.checkIn && !employeeDashboard.checkOut && (
                <Button
                  className="check-btn check-out"
                  onClick={handleCheckOut}
                  disabled={checkOutDisabled}
                >
                  {checkOutDisabled
                    ? `Checkout available in ${Math.floor(checkOutCooldownLeft / 60)}:${String(checkOutCooldownLeft % 60).padStart(2, "0")}`
                    : "⛔ Check Out"}
                </Button>

              )}

              {employeeDashboard.checkIn && employeeDashboard.checkOut && (
                <span className="text-success fw-semibold">
                  ✔ Attendance completed
                </span>
              )}
            </div>

          </Card.Body>
        </Card>

      )}

      <Tabs className="mb-4">
        <Tab eventKey="overview" title={<span><FaChartLine /> Overview</span>}>
          <div className="mt-4">
            <h4 className="quick-stats-title">Quick Stats</h4>
            <Row className="g-4 mt-2">
              <Col md={3}>
                <Link to={"/employees"} className="link">
                  <Card className="stat-card"><Card.Body><h6>Total Employees</h6><h3>{stats.totalEmployees}</h3></Card.Body></Card>
                </Link>
              </Col>
              <Col md={3}>
                <Link to={`/attendance?status=${stats.presentLabel === "Online Now" ? "ONLINE" : "PRESENT"}`} className="link">
                  <Card className="stat-card">
                    <Card.Body>
                      <h6>{stats.presentLabel}</h6>
                      <h3>{stats.presentToday}</h3>
                    </Card.Body>
                  </Card>
                </Link>

              </Col>
              <Col md={3}>
                <Link to="/attendance?status=ABSENT" className="link">
                  <Card className="stat-card border-danger">
                    <Card.Body>
                      <h6>Absent Today</h6>
                      <h3 className="text-danger">{stats.absentToday}</h3>
                    </Card.Body>
                  </Card>
                </Link>
              </Col>

              <Col md={3}>
                <Link to={"/leaves"} className="link">
                  <Card className="stat-card"><Card.Body><h6>On Leave</h6><h3>{stats.onLeave}</h3></Card.Body></Card>
                </Link>
              </Col>
              <Col md={3}>
                <Link to={"/employees"} className="link">
                  <Card className="stat-card"><Card.Body><h6>Departments</h6><h3>{stats.departments}</h3></Card.Body></Card>
                </Link>
              </Col>

            </Row>
            <Row className="g-4 mt-3">
              <Col md={4}>
                {holidayMiniCard(false)}
              </Col>

              <Col md={4}>
                {birthdayMiniCard()}
              </Col>
            </Row>

          </div>
        </Tab>

        <Tab eventKey="employees" title={<span><FaUsers /> Employees</span>}>
          <div className="mt-4">
            <div className="d-flex justify-content-between mb-3">
              <h4 className="employee-management-title">Employee Management</h4>
              <Button variant="primary" onClick={() => { setOpenForm(!openForm); setEditingEmployee(null); }}>
                <FaUserPlus className="me-2" />
                {openForm ? "Close Form" : "Add Employee"}
              </Button>
            </div>

            <Collapse in={openForm}>
              <div>
                <EmployeeForm
                  editingEmployee={editingEmployee}
                  onCancel={() => { setOpenForm(false); setEditingEmployee(null); }}
                  onSubmit={async (data) => {
                    try {
                      if (editingEmployee) await employeeApi.update(editingEmployee.id, data);
                      else await employeeApi.create(data);
                      await loadAdminDashboard();
                      setOpenForm(false);
                      setEditingEmployee(null);
                    } catch (err) {
                      console.error(err);
                      alert("Failed to save employee.");
                    }
                  }}
                />
              </div>
            </Collapse>

            <Card className="mt-3">
              <Card.Body>
                {/* Desktop Table */}
                <div className="d-none d-md-block">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Designation</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Joining Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.length ? employees.map(emp => (
                          <tr key={emp.id}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/employees/${emp.id}`)}
                          >
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <img
                                  src={
                                    emp.avatar || "/profile.jpg"
                                  }
                                  alt="Avatar"
                                  style={{ width: 50, height: 50, borderRadius: "50%" }}
                                />
                                <div>
                                  <div className="fw-semibold">{emp.firstName} {emp.lastName}</div>
                                  <small className="text-muted">{emp.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>{emp.designation}</td>
                            <td>{emp.departmentName}</td>
                            <td>{emp.status || "ACTIVE"}</td>
                            <td>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "N/A"}</td>
                            <td>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEmployee(emp);
                                }}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEmployee(emp.id);
                                }}
                              >
                                <FaTrash />
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="6" className="text-center">No employees found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Mobile Cards */}
                <div className="d-block d-md-none">
                  {employees.length ? employees.map(emp => (
                    <Card key={emp.id} className="mb-3 shadow-sm"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <img
                            src={
                              emp.avatar || "/profile.jpg"
                            }
                            alt="Avatar"
                            style={{ width: 60, height: 60, borderRadius: "50%", marginRight: 12 }}
                          />
                          <div>
                            <div className="fw-bold">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <small className="text-muted">{emp.email}</small>
                          </div>
                        </div>

                        <div className="small text-muted mb-1">
                          <strong>Designation:</strong> {emp.designation || "—"}
                        </div>

                        <div className="small text-muted mb-1">
                          <strong>Department:</strong> {emp.departmentName || "—"}
                        </div>

                        <div className="small text-muted mb-1">
                          <strong>Status:</strong>{" "}
                          <span className={`badge ${emp.status === "INACTIVE" ? "bg-danger" : "bg-success"}`}>
                            {emp.status || "ACTIVE"}
                          </span>
                        </div>

                        <div className="small text-muted mb-3">
                          <strong>Joined:</strong>{" "}
                          {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "N/A"}
                        </div>

                        <div className="d-flex justify-content-end gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEmployee(emp);
                            }}
                          >
                            <FaEdit />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEmployee(emp.id);
                            }}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  )) : (
                    <div className="text-center text-muted">No employees found.</div>
                  )}
                </div>


              </Card.Body>
            </Card>
          </div>
        </Tab>

        <Tab eventKey="attendance" title={<span><FaCalendarAlt /> Attendance</span>}>
          <Card className="mt-4">
            <Card.Body className="text-center py-5">
              <h5>Attendance Management</h5>
              <Button onClick={() => navigate("/attendance")}>View Attendance</Button>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </>
  );


  // Employee View

  const renderEmployeeView = () => (
    <div className="employee-dashboard fade-in">
      <Row className="g-3 align-items-stretch">
        <Col md={4}>
          <Card className="attendance-card mb-4 animated-card h-100 d-flex flex-column checkin-ui-card">
            <Card.Body className="text-center">

              {/* Avatar */}
              <div className="checkin-avatar" onClick={(evt) => {
                evt.stopPropagation();
                navigate("/profile")
              }}>
                {user?.employee?.avatar ? (
                  <img
                    src={user.employee.avatar}
                    alt="Profile"
                    className="checkin-avatar-img"
                  />
                ) : (
                  (user?.employee?.firstName?.[0] ||
                    user?.username?.[0] ||
                    "U"
                  ).toUpperCase()
                )}
              </div>


              {/* Name & Role */}
              <div className="mt-3">
                <div className="fw-semibold">
                  {user?.employee?.employeeId || "1"}
                </div>
                <div className="text-muted small">
                  {user?.employee?.firstName} {user?.employee?.lastName}
                </div>
                <div className="text-muted small">
                  {user?.employee?.designation || "CEO"}
                </div>
              </div>

              {/* Status */}
              {!employeeDashboard.checkIn && (
                <div className="text-danger small mt-2">Yet to check-in</div>
              )}

              {employeeDashboard?.isValidLocation === false && (
                <div className="text-danger small mt-1">
                  ⚠ Check-in from unauthorized location
                </div>
              )}

              {/* Timer */}
              <div className="checkin-timer mt-2">
                {(() => {
                  const [hh, mm, ss] = (employeeDashboard.checkIn ? workTimer : "00:00:00").split(":");
                  return (
                    <>
                      <span>{hh}</span>
                      <span className="colon">:</span>
                      <span>{mm}</span>
                      <span className="colon">:</span>
                      <span>{ss}</span>
                    </>
                  );
                })()}
              </div>

              {/* Check-in / Check-out info */}
              <div className="mt-2 text-muted small">
                {employeeDashboard.checkIn
                  ? `Checked in at ${new Date(employeeDashboard.checkIn).toLocaleTimeString()}`
                  : "You haven't checked in yet"}
              </div>

              {employeeDashboard.checkOut && (
                <div className="text-muted small">
                  Checked out at {new Date(employeeDashboard.checkOut).toLocaleTimeString()}
                </div>
              )}

              {/* Check-in / Check-out / Completed */}
              <div className="mt-4 d-flex justify-content-center gap-3">
                {!employeeDashboard.checkIn && (
                  <Button
                    className="checkin-outline-btn"
                    onClick={handleCheckIn}
                    disabled={geoLoading}
                  >
                    {geoLoading ? "Fetching Location..." : "Check-in"}
                  </Button>
                )}

                {employeeDashboard.checkIn && !employeeDashboard.checkOut && (
                  <Button
                    className="check-btn check-out"
                    onClick={handleCheckOut}
                    disabled={checkOutDisabled}
                  >
                    {checkOutDisabled
                      ? `Checkout available in ${Math.floor(checkOutCooldownLeft / 60)}:${String(
                        checkOutCooldownLeft % 60
                      ).padStart(2, "0")}`
                      : "⛔ Check Out"}
                  </Button>
                )}

                {employeeDashboard.checkIn && employeeDashboard.checkOut && (
                  <span className="text-success fw-semibold">
                    ✔ Attendance completed
                  </span>
                )}
              </div>

            </Card.Body>
          </Card>
        </Col>


        <Col>
          <Card className="attendance-card mb-4 animated-card h-100 d-flex flex-column">

            <Card.Body>
              <h6 className="text-muted">Quick Actions</h6>

              <div className="d-grid gap-2 mt-3">
                <Button variant="outline-secondary" onClick={() => navigate("/attendance")}>
                  <FaCalendarAlt className="me-2" /> My Attendance
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate("/leaves")}>
                  Leave History
                </Button>
              </div>
              <div className="mt-5">
                <h6 className="text-muted">Today Summary</h6>

                <div className="d-flex justify-content-between mt-2">
                  <span>Status</span>
                  <span className="fw-bold text-success">
                    {employeeDashboard.checkIn ? "PRESENT" : "NOT CHECKED IN"}
                  </span>
                </div>

                <div className="d-flex justify-content-between">
                  <span>Check In</span>
                  <span>
                    {employeeDashboard.checkIn
                      ? new Date(employeeDashboard.checkIn).toLocaleTimeString()
                      : "--"}
                  </span>
                </div>

                <div className="d-flex justify-content-between">
                  <span>Worked Time</span>
                  <span className="fw-semibold">{workTimer}</span>
                </div>
              </div>
            </Card.Body>
          </Card>

        </Col>

        <Col md={4}>
          <Link to={'/tasks'} className="link">
            <Card className="attendance-card mb-4 animated-card h-100 d-flex flex-column">

              <Card.Body>
                <h6 className="text-muted mb-3">Today’s Tasks</h6>

                {todayTasks.length === 0 ? (
                  <div className="text-muted text-center small">
                    You don’t have any tasks today 🎉
                  </div>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {todayTasks.map(task => (
                      <li
                        key={task.id}
                        className="d-flex justify-content-between align-items-center mb-2 p-2 rounded bg-light"
                      >
                        <div>
                          <div className="fw-semibold">{task.title}</div>
                          <small className="text-muted">
                            Priority: {task.priority}
                          </small>
                        </div>

                        <span
                          className={`badge ${task.status === "COMPLETED"
                            ? "bg-success"
                            : "bg-warning text-dark"
                            }`}
                        >
                          {task.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Body>
            </Card>
          </Link>
        </Col>

      </Row>
      <Row className="g-3 mt-2 align-items-stretch">

        <Col md={4} >
          <Card className="attendance-card mb-4 animated-card h-100 d-flex flex-column">
            <Card.Body>
              <h6 className="text-muted">Leave Balance</h6>

              <div className="mt-2">
                <div className="d-flex justify-content-between">
                  <span>Used</span>
                  <strong>{employeeDashboard.leaveUsed}</strong>
                </div>

                <div className="d-flex justify-content-between">
                  <span>Remaining</span>
                  <strong>{employeeDashboard.leaveRemaining}</strong>
                </div>

                <div className="d-flex justify-content-between">
                  <span>Total</span>
                  <strong>{employeeDashboard.leaveTotal}</strong>
                </div>
              </div>

              <Button
                className="w-100 mt-3"
                variant="outline-primary"
                onClick={() => navigate("/leaves")}
              >
                Apply Leave
              </Button>

              <hr />

              <div className="d-flex justify-content-between small text-muted">
                <span>Approved</span>
                <span className="text-success fw-semibold">
                  {employeeDashboard.leaveApproved}
                </span>
              </div>

              <div className="d-flex justify-content-between small text-muted">
                <span>Rejected</span>
                <span className="text-danger fw-semibold">
                  {employeeDashboard.leaveRejected}
                </span>
              </div>

            </Card.Body>
          </Card>

        </Col>

        <Col md={4}>
          {holidayMiniCard(false)}
        </Col>
        <Col md={4}>
          {birthdayMiniCard()}
        </Col>

      </Row>
    </div>
  );


  // Main render

  if (loading || !user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "70vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="py-4">
      <div className=" mb-4">
        <h2>
          Welcome, {user?.employee?.firstName || user?.username} {user?.employee?.lastName || ''}
        </h2>
        <p className="text-muted1">
          {isAdminOrHr ? "You have administrative access" : "Here’s your activity overview"}
        </p>

      </div>

      {isAdminOrHr ? renderAdminView() : renderEmployeeView()}
    </Container>
  );
};

export default Dashboard;

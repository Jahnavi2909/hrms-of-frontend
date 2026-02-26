import { Card, Col, ProgressBar, Row, Tab, Tabs } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


import { FaCalendarAlt, FaCamera, FaClock, FaEnvelope, FaIdCard, FaMapMarkerAlt, FaPhone, FaUser, FaUserTag, FaUserTie } from "react-icons/fa";
import { attendanceApi, employeeApi } from "../../services/api";
import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./style.css";
import WeeklySummaryByEmployee from "../../components/historysummury/WeeklyHistorySummaryByEmployee";
import MonthlySummaryByEmployee from "../../components/historysummury/MonthlyHistorySummaryByEmployee";
import { STATUS_COLORS } from "../Attendance/constants";
import { getTimelineStatuses } from "../../utils/utils";

const SHIFT_HOURS = 8;




const EmployeeProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [employee, setEmployee] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [liveWorked, setLiveWorked] = useState({});
  const [uploading, setUploading] = useState(false);

  const [preview, setPreview] = useState(null);
  const [avatarError, setAvatarError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAttendanceFilters, setShowAttendanceFilters] = useState(false);


  const rangedAttendance = attendance.filter(r => {
    if (!fromDate || !toDate) return true;
    return r.date >= fromDate && r.date <= toDate;
  });


  const exportAttendanceExcel = (rows = attendance) => {

    if (!employee?.employeeId) {
      alert("Attendance export not available for admin");
      return;
    }
    const data = rows.map(r => ({
      Date: formatDate(r.date),
      Status: r.attendanceStatus,
      "Check In": formatTime(r.checkInTime),
      "Check Out": formatTime(r.checkOutTime),
      "Hours Worked": r.workedTime || "00:00",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(file, `attendance_${employee.employeeId}.xlsx`);
  };

  const exportProfilePdf = (rows = attendance) => {
    if (!employee?.employeeId) return;

    const doc = new jsPDF("landscape");


    doc.setFontSize(16);
    doc.text("Employee Attendance Report", 14, 15);

    let startY = 25;


    doc.setFontSize(10);
    doc.text(`Employee Name: ${employee.firstName} ${employee.lastName}`, 14, startY);
    doc.text(`Employee ID: ${employee.employeeId}`, 14, startY + 6);
    doc.text(`Department: ${employee.departmentName}`, 14, startY + 12);
    doc.text(`Email: ${employee.email}`, 14, startY + 18);
    doc.text(`Phone: ${employee.phone}`, 14, startY + 24);


    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      240,
      15
    );

    startY += 35;

    autoTable(doc, {
      startY: startY,

      head: [["Date", "Status", "Check In", "Check Out", "Hours Worked"]],

      body: rows.map((r) => [
        formatDate(r.date),
        r.attendanceStatus,
        formatTime(r.checkInTime),
        formatTime(r.checkOutTime),
        r.workedTime || "00:00",
      ]),

      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },

      columnStyles: {
        0: { cellWidth: 40 },  // Date
        1: { cellWidth: 45 },  // Status
        2: { cellWidth: 45 },  // Check In
        3: { cellWidth: 45 },  // Check Out
        4: { cellWidth: 45 },  // Hours
      },

      headStyles: {
        fillColor: [33, 150, 243],
        textColor: 255,
        halign: "center",
      },

      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },

      theme: "grid",
    });


    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`attendance_${employee.employeeId}.pdf`);
  };



  const fileInputRef = useRef(null);

  // ---------- EMPLOYEE CONTEXT ----------
  const isAdmin = user?.role === "ROLE_ADMIN";
  const empId = id || (!isAdmin ? user?.employeeId : null);


  const getWeekStart = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay() || 7;
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    return d.toISOString().split("T")[0];
  };

  const [weekStart, setWeekStart] = useState(getWeekStart());

  const handlePreviousMonth = () => {
    setPage(0);
    setFromDate("");
    setToDate("");

    if (month === 1) {
      setMonth(12);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setPage(0);
    setFromDate("");
    setToDate("");

    if (month === 12) {
      setMonth(1);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
  };




  useEffect(() => {
    if (isAdmin && !id) {
      setEmployee({
        firstName: user.username,
        lastName: "",
        email: user.email,
        role: user.role,
        employeeId: "ADMIN",
        designation: "Administrator",
        isActive: true,
      });
      return;
    }

    if (!empId) return;

    const fetchEmployeeData = async () => {
      try {
        const response = await employeeApi.getById(empId);
        const employeeData = response?.data?.data;

        if (!employeeData) {
          throw new Error("Invalid employee response");
        }

        setEmployee(employeeData);

        const attendanceRes = await attendanceApi.getAttendanceHistory(
          empId,
          year,
          month,
          page,
          size
        );

        let pageData = attendanceRes?.data?.data;

        let content = pageData?.content || [];

        // Apply date filter AFTER backend month filter
        if (fromDate && toDate) {
          content = content.filter(r => r.date >= fromDate && r.date <= toDate);
        }

        setAttendance(content);
        setTotalPages(pageData?.totalPages || 0);


      } catch (err) {
        setError("Failed to load employee data");
      }
    };

    fetchEmployeeData();
  }, [empId, isAdmin, id, user, page, month, year]);

  useEffect(() => {
    setPage(0);
  }, [month, year, fromDate, toDate]);


  useEffect(() => {
    const timer = setInterval(() => {
      const updated = {};
      attendance.forEach(r => {
        if (r.checkInTime && !r.checkOutTime) {
          const start = r.checkInTime.includes("T")
            ? new Date(r.checkInTime)
            : new Date(`${r.date}T${r.checkInTime}`);

          if (!isNaN(start)) {
            const now = new Date();
            const mins = Math.floor((now - start) / 60000);
            const h = String(Math.floor(mins / 60)).padStart(2, "0");
            const m = String(mins % 60).padStart(2, "0");
            updated[r.id] = `${h}:${m}`;
          }
        }
      });
      setLiveWorked(updated);
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance]);

  const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";

    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      if (isNaN(d)) return "--:--";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "--:--";

    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  };



  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";

    return d.toLocaleDateString();
  };


  const formatHoursWorked = (time) => {
    if (!time) return "00 hrs 00 min";
    const [h, m] = time.split(":").map(Number);
    return `${String(h).padStart(2, "0")} hrs ${String(m).padStart(2, "0")} min`;
  };

  const handleAvatarClick = () => {
    if (uploading || isAdmin) return;
    fileInputRef.current.value = null;
    fileInputRef.current.click();
  };


  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Only JPG, PNG, or WEBP images are allowed");
      return;
    }

    setAvatarError("");
    setPreview(URL.createObjectURL(file));

    try {
      setUploading(true);

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("avatar", compressedFile);

      const res = await employeeApi.uploadAvatar(empId, formData);

      setEmployee(prev => ({
        ...prev,
        avatar: res.data.data.avatar,
      }));

      setPreview(null);
    } catch (err) {
      console.error(err);
      setAvatarError("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };


  const handleResign = async () => {
    if (!window.confirm("Are you sure you want to resign this employee?")) return;

    try {
      await employeeApi.resignEmployee({
        employeeId: empId,
        reason: "Resigned by admin",
      });

      setEmployee(prev => ({
        ...prev,
        isActive: false,
        resignationDate: new Date().toISOString(),
      }));
    } catch (err) {
      alert("Failed to resign employee");
    }
  };

  const handleReactivate = async () => {
    if (!window.confirm("Re-activate this employee?")) return;

    try {
      await employeeApi.reactivateEmployee(empId);

      setEmployee(prev => ({
        ...prev,
        isActive: true,
        resignationDate: null,
        resignationReason: null,
      }));
    } catch (err) {
      alert("Failed to reactivate employee");
    }
  };




  const Timeline = ({ rec }) => {
    if (!rec.checkInTime) return null;

    const worked = rec.checkOutTime
      ? rec.workedTime
      : liveWorked[rec.id];

    const hoursWorked = worked ? parseInt(worked.split(":")[0]) : 0;
    const percent = Math.min((hoursWorked / SHIFT_HOURS) * 100, 100);

    return (
      <div className="mt-1">
        <small className="text-muted">
          {formatTime(rec.checkInTime)} →{" "}
          {rec.checkOutTime ? formatTime(rec.checkOutTime) : "Now"}
        </small>

        <ProgressBar
          now={percent}
          style={{ height: "4px", borderRadius: "10px" }}
          variant={percent < 50 ? "danger" : "success"}
        />
      </div>
    );
  };


  if (employee === null) {
    return <div className="text-center mt-5">Loading profile...</div>;
  }


  return (
    <>
      <div className="employee-profile">
        {error && <p className="text-danger">{error}</p>}

        <div className="profile-header">
          <div className="profile-cover"></div>
          <div className="profile-info">


            <div
              className={`profile-avatar  ${uploading ? "disabled" : ""}`}
              onClick={handleAvatarClick}
            >

              {employee?.avatar ? (
                <img
                  src={preview || employee?.avatar || "/profile.jpg"}
                  alt="profile"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = "true";
                      e.currentTarget.src = "/profile.jpg";
                    }
                  }}
                />

              ) : (
                <div className="avatar-placeholder">
                  {`${employee?.firstName?.[0] || ""}${employee?.lastName?.[0] || ""}`.toUpperCase()}
                </div>
              )}

              {avatarError && (
                <small className="text-danger mt-1">{avatarError}</small>
              )}

              {!isAdmin && (
                <div className="avatar-overlay">
                  <FaCamera />
                  <span>{uploading ? "Uploading..." : "Change"}</span>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                hidden
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="profile-meta">
              <h2 className="profile-name">
                {employee.firstName
                  ? `${employee.firstName} ${employee.lastName || ""}`
                  : "Admin"}
              </h2>

              <p className="text-muted">{employee.designation}</p>
              <div className="d-flex align-items-center gap-2 mt-2">
                <span
                  className={`status-badge ${employee?.isActive ? "active" : "inactive"
                    }`}
                >
                  {employee?.isActive ? "ACTIVE" : "INACTIVE"}
                </span>

                {employee.resignationDate && (
                  <small className="text-muted">
                    Resigned on{" "}
                    {new Date(employee.resignationDate).toLocaleDateString()}
                  </small>
                )}
              </div>

              {isAdmin && id && (
                <div className="mt-3 d-flex gap-2">
                  {employee?.isActive ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleResign}
                    >
                      Resign Employee
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={handleReactivate}
                    >
                      Re-Activate Employee
                    </button>
                  )}
                </div>
              )}


              <div className="employee-meta">
                <span><FaIdCard className="me-2" /> Employee ID: {employee.employeeId || "N/A"}</span>
                <span><FaUserTie className="me-2" /> {employee.departmentName || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {!(isAdmin && !id) && (
          <Tabs className="mb-4 profile-tabs">
            <Tab eventKey="profile" title="Profile">
              <Row className="mt-4">
                <Col md={8}>
                  <Card className="mb-4">
                    <Card.Header>Personal Information</Card.Header>
                    <Card.Body>
                      <Row className="mb-3">
                        <Col md={6}>
                          <p className="mb-1"><FaUser className="me-2" /> <strong>First Name:</strong></p>
                          <p>{employee.firstName || "N/A"}</p>
                        </Col>
                        <Col md={6}>
                          <p className="mb-1"><FaUserTag className="me-2" /> <strong>Last Name:</strong></p>
                          <p>{employee.lastName || "N/A"}</p>
                        </Col>
                      </Row>
                      <Row className="mb-3">
                        <Col md={6}>
                          <p className="mb-1"><FaEnvelope className="me-2" /> <strong>Email:</strong></p>
                          <p>{employee.email || "N/A"}</p>
                        </Col>
                        <Col md={6}>
                          <p className="mb-1"><FaPhone className="me-2" /> <strong>Phone:</strong></p>
                          <p>{employee.phone || "N/A"}</p>
                        </Col>
                      </Row>
                      <Row className="mb-3">
                        <Col md={6}>
                          <p className="mb-1"><FaCalendarAlt className="me-2" /> <strong>Joining Date:</strong></p>
                          <p>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "N/A"}</p>
                        </Col>
                        <Col md={6}>
                          <p className="mb-1"><FaCalendarAlt className="me-2" /> <strong>Date of Birth:</strong></p>
                          <p>{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                        </Col>
                        <Col md={6}>
                          <p className="mb-1"><FaMapMarkerAlt className="me-2" /> <strong>Address:</strong></p>
                          <p>{employee.address || "N/A"}</p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4}>
                  <Card className="mb-4">
                    <Card.Header>Quick Stats</Card.Header>
                    <Card.Body>
                      <div className="stat-item">
                        <FaClock className="me-2" />
                        <div>
                          <h6>Total Working Days</h6>
                          <p className="mb-0">{attendance.filter(a => a.attendanceStatus === 'PRESENT' || a.attendanceStatus === 'HALF_DAY').length} days</p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>


            <Tab eventKey="attendance" title="Attendance">
              {/* ================= Attendance Filters ================= */}
              <Card className="mb-3 mt-2 employee-profile-filter-section">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>Attendance Filters</span>

                  {/* Mobile Toggle */}
                  <button
                    className="btn btn-outline-primary btn-sm d-md-none"
                    onClick={() => setShowAttendanceFilters(!showAttendanceFilters)}
                  >
                    {showAttendanceFilters ? "Hide" : "Show"}
                  </button>
                </Card.Header>

                {/* DESKTOP – Always Visible */}
                <Card.Body className="d-none d-md-block">
                  <div className="d-flex align-items-end gap-3 flex-wrap">
                    <div>
                      <label className="date-label">From date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="date-label">To date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>

                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => exportAttendanceExcel(rangedAttendance)}
                    >
                      Export Excel
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => exportProfilePdf(rangedAttendance)}
                    >
                      Export PDF
                    </button>
                  </div>
                </Card.Body>

                {/* MOBILE – Collapsible */}
                {showAttendanceFilters && (
                  <Card.Body className="d-md-none">
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <label className="date-label">From date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="date-label">To date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                        />
                      </div>

                      <button
                        className="btn btn-success"
                        onClick={() => exportAttendanceExcel(rangedAttendance)}
                      >
                        Export Excel
                      </button>

                      <button
                        className="btn btn-danger"
                        onClick={() => exportProfilePdf(rangedAttendance)}
                      >
                        Export PDF
                      </button>
                    </div>
                  </Card.Body>
                )}
              </Card>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handlePreviousMonth}
                >
                  ← Previous Month
                </button>

                <strong>
                  {new Date(year, month - 1).toLocaleString("default", {
                    month: "long",
                  })}{" "}
                  {year}
                </strong>

                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleNextMonth}
                >
                  Next Month →
                </button>
              </div>


              <Card className="mt-4">
                <Card.Header>Attendance History</Card.Header>
                <Card.Body>
                  {/* Desktop Table */}
                  <div className="table-responsive d-none d-md-block">
                    {rangedAttendance.length > 0 ? (
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Hours Worked</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rangedAttendance.map((record, idx) => (
                            <tr key={idx}>
                              <td>{formatDate(record.date)}</td>
                              <td>
                                {getTimelineStatuses(record).map(status => (
                                  <span
                                    key={status}
                                    className={`badge bg-${STATUS_COLORS[status]} me-1`}
                                  >
                                    {status}
                                  </span>
                                ))}
                              </td>


                              <td>{formatTime(record.checkInTime)}</td>
                              <td>{formatTime(record.checkOutTime)}</td>
                              <td>
                                <div className="field">
                                  <div className="value">
                                    {record.checkOutTime
                                      ? formatHoursWorked(record.workedTime)
                                      : formatHoursWorked(liveWorked[record.id])}
                                  </div>
                                  <Timeline rec={record} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    ) : (
                      <p>No attendance records found</p>
                    )}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      disabled={page === 0}
                      onClick={() => setPage(prev => prev - 1)}
                    >
                      Previous
                    </button>

                    <span>
                      Page {page + 1} of {totalPages}
                    </span>

                    <button
                      className="btn btn-outline-secondary btn-sm"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage(prev => prev + 1)}
                    >
                      Next
                    </button>
                  </div>


                  {/* Mobile Cards */}
                  <div className="d-block d-md-none">
                    {rangedAttendance.length > 0 ? (
                      rangedAttendance.map((record, idx) => (
                        <div className="attendance-card p-3 mb-3 border rounded" key={idx}>
                          <div className="d-flex justify-content-between mb-2">
                            <span>{formatDate(record.date)}</span>
                            <div className="d-flex flex-wrap gap-1">
                              {getTimelineStatuses(record).map(status => (
                                <span
                                  key={status}
                                  className={`badge bg-${STATUS_COLORS[status]}`}
                                >
                                  {status}
                                </span>
                              ))}
                            </div>


                          </div>
                          <div className="d-flex justify-content-between">
                            <div>Check In: {formatTime(record.checkInTime)}</div>
                            <div>Check Out: {formatTime(record.checkOutTime)}</div>
                          </div>
                          <div className="mt-2">Hours Worked: {record.hoursWorked || '--'}</div>
                        </div>
                      ))
                    ) : (
                      <p>No attendance records found</p>
                    )}
                  </div>
                </Card.Body>
              </Card>

              <div className="d-flex justify-content-between align-items-center mt-3 mb-3">
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() =>
                    setWeekStart(prev => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() - 7);
                      return d.toISOString().split("T")[0];
                    })
                  }
                >
                  ← Previous Week
                </button>

                <strong>Week Starting: {weekStart}</strong>

                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() =>
                    setWeekStart(prev => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() + 7);
                      return d.toISOString().split("T")[0];
                    })
                  }
                >
                  Next Week →
                </button>
              </div>


              <Card className="mb-4">
                <Card.Header>
                  <strong>Attendance Summary</strong>
                </Card.Header>

                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <WeeklySummaryByEmployee weekStart={weekStart} employeeId={empId} />
                    </Col>


                    <Col md={6}>
                      <MonthlySummaryByEmployee
                        employeeId={empId}
                        year={year}
                        month={month}
                        isAdmin={false}
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        )}
      </div >
      {/* ADMIN PROFILE */}
      {isAdmin && !id && (
        <Card className="p-3">
          <h4>Admin Profile</h4>
          <p>
            <strong>Name:</strong>{" "}
            {employee.firstName
              ? `${employee.firstName} ${employee.lastName || ""}`
              : "Admin"}
          </p>
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Role:</strong> ADMIN</p>
        </Card>
      )}
    </>
  );
};

export default EmployeeProfile;

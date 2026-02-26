import { useEffect, useState } from "react";
import { Badge, Card, Col, ProgressBar, Row } from "react-bootstrap";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

import { attendanceApi } from "../../services/api";
import { useParams } from "react-router-dom";
import EmployeeProfileInfo from "../../contexts/layout/EmployeeProfileInfo";
import WeeklySummaryByEmployee from "../../components/historysummury/WeeklyHistorySummaryByEmployee";
import MonthlySummaryByEmployee from "../../components/historysummury/MonthlyHistorySummaryByEmployee";
import { isLateAttendance } from "../../utils/attendanceUtils";
import { STATUS_COLORS } from "../Attendance/constants";
import autoTable from "jspdf-autotable";
import './style.css'


const SHIFT_HOURS = 8;

/* ---------- Helpers ---------- */

const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";

    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "--:--";

    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};



const formatHoursWorked = (time) => {
    if (!time || !time.includes(":")) return "00 hrs 00 min";

    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "00 hrs 00 min";

    return `${String(h).padStart(2, "0")} hrs ${String(m).padStart(2, "0")} min`;
};


/* ---------- Timeline ---------- */

const Timeline = ({ record, liveWorked }) => {
    const worked = record.checkOutTime ? record.workedTime : liveWorked[record.id];

    const [hours, minutes] = worked ? worked.split(":").map(Number) : [0, 0];
    const percent = Math.min(((hours * 60 + minutes) / (SHIFT_HOURS * 60)) * 100, 100);

    return (
        <div className="mt-1">
            <small className="text-muted">
                {formatTime(record.checkInTime)} → Now
            </small>

            <ProgressBar now={percent} style={{ height: "4px", borderRadius: "10px" }} variant={percent < 50 ? STATUS_COLORS : "success"} />
        </div>
    );
};


const calculateLiveWorked = (record) => {
    if (!record?.checkInTime || record.checkOutTime) return null;

    const today = new Date().toISOString().split("T")[0];
    if (record.date !== today) return null;

    const [h, m, s = 0] = record.checkInTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;

    const start = new Date();
    start.setHours(h, m, s, 0);

    const mins = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));

    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");

    return `${hh}:${mm}`;
};


/* ---------- Main Component ---------- */

const AttendanceHistory = ({ employeeId }) => {
    const { id } = useParams();
    const [attendance, setAttendance] = useState([]);
    const [liveWorked, setLiveWorked] = useState({});
    const [error, setError] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");


    const [originalData, setOriginalData] = useState([]);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const today = new Date();

    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const [page, setPage] = useState(0);
    const [size] = useState(10);

    const [totalPages, setTotalPages] = useState(0);

    const exportPDF = () => {
        if (!filteredAttendance.length) return;

        const doc = new jsPDF("landscape");


        doc.setFontSize(16);
        doc.text("Attendance Report", 14, 15);


        doc.setFontSize(10);
        doc.text(
            `Generated: ${new Date().toLocaleDateString()}`,
            doc.internal.pageSize.width - 60,
            15
        );

        let startY = 25;

        autoTable(doc, {
            startY: startY,

            head: [["Date", "Status", "Check In", "Check Out", "Hours Worked"]],

            body: filteredAttendance.map(item => [
                new Date(item.date).toLocaleDateString(),
                item.attendanceStatus,
                formatTime(item.checkInTime),
                formatTime(item.checkOutTime),
                item.workedTime || "00:00",
            ]),

            styles: {
                fontSize: 9,
                cellPadding: 3,
                overflow: "linebreak",
                valign: "middle",
            },

            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 50 },
                2: { cellWidth: 50 },
                3: { cellWidth: 50 },
                4: { cellWidth: 50 },
            },

            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                halign: "center",
            },

            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },

            theme: "grid",
        });

        // ===== Footer Page Numbers =====
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

        doc.save("attendance-report.pdf");
    };




    const exportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            originalData.map(item => ({
                "Employee ID": item.employeeCode,
                "Name": item.firstName,
                "Date": item.date,
                "Check In": formatTime(item.checkInTime),
                "Check Out": formatTime(item.checkOutTime),
                "Status": item.attendanceStatus,
                "Worked Time": item.workedTime || "--"
            }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        XLSX.writeFile(workbook, "attendance-report.xlsx");
    };




    const empId = id || employeeId;
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await attendanceApi.getAttendanceHistory(
                    empId,
                    year,
                    month,
                    page,
                    size
                );
                const content = res?.data?.data?.content ?? [];
                setAttendance(content);
                setOriginalData(content);
                // setFilteredData(content);
                setTotalPages(res?.data?.data?.totalPages ?? 0);


            } catch (err) {
                console.error(err);
                setError("Failed to load data");
                setAttendance([]);
                setTotalPages(0);
            }
        };

        if (empId) fetchData();
    }, [empId, year, month, page, size]);


    const handleFilter = (value) => {
        const filtered = originalData.filter(item =>
            item.name.toLowerCase().includes(value.toLowerCase())
        );
        // setFilteredData(filtered);
    };


    const getWeekStart = (date = new Date()) => {
        const d = new Date(date);
        const day = d.getDay() || 7;
        if (day !== 1) d.setDate(d.getDate() - (day - 1));
        return d.toISOString().split("T")[0];
    };

    const weekStart = getWeekStart();

    const filteredAttendance = attendance.filter((rec) => {
        let dateMatch = true;
        let statusMatch = true;

        if (selectedDate) {
            dateMatch = rec.date === selectedDate;
        }

        if (statusFilter !== "ALL") {
            statusMatch = rec.attendanceStatus === statusFilter;
        }

        return dateMatch && statusMatch;
    });



    /* ---- Live Timer ---- */
    useEffect(() => {
        const timer = setInterval(() => {
            const updated = {};

            attendance.forEach((r) => {
                if (r.checkInTime && !r.checkOutTime) {
                    const live = calculateLiveWorked(r);
                    if (live) updated[r.id] = live;
                }
            });

            setLiveWorked(updated);
        }, 1000);

        return () => clearInterval(timer);
    }, [attendance]);



    return (
        <div>
            {error && <p className="text-danger">{error}</p>}

            <EmployeeProfileInfo empId={empId} />


            <Card className="p-3">
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
                                    year={new Date().getFullYear()}
                                    month={new Date().getMonth() + 1}
                                    isAdmin={false}
                                />
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
                <Card.Header>Attendance History</Card.Header>
                {/* ================= FILTERS ================= */}
                <Card className="mt-4 mb-3 attendance-history-filter-section">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Filters</span>

                        {/* Mobile Toggle */}
                        <button
                            className="btn btn-outline-primary btn-sm d-md-none"
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                        >
                            {showMobileFilters ? "Hide" : "Show"}
                        </button>
                    </Card.Header>

                    {/* DESKTOP – Always Visible */}
                    <Card.Body className="d-none d-md-block">
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </Col>

                            <Col md={4}>
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PRESENT">Present</option>
                                    <option value="HALF_DAY">Half Day</option>
                                    <option value="ABSENT">Absent</option>
                                    <option value="LATE">Late</option>
                                </select>
                            </Col>

                            <Col md={4}>
                                <div className="d-flex gap-2">
                                    <button onClick={exportPDF} className="btn btn-danger">
                                        Export PDF
                                    </button>

                                    <button onClick={exportExcel} className="btn btn-success">
                                        Export Excel
                                    </button>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>

                    {/* MOBILE – Collapsible */}
                    {showMobileFilters && (
                        <Card.Body className="d-md-none">
                            <div className="d-flex flex-column gap-3">
                                <div>
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PRESENT">Present</option>
                                        <option value="HALF_DAY">Half Day</option>
                                        <option value="ABSENT">Absent</option>
                                        <option value="LATE">Late</option>
                                    </select>
                                </div>

                                <button onClick={exportPDF} className="btn btn-danger">
                                    Export PDF
                                </button>

                                <button onClick={exportExcel} className="btn btn-success">
                                    Export Excel
                                </button>
                            </div>
                        </Card.Body>
                    )}
                </Card>

                <Row className="mb-3">
                    <Col md={4}>
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => {
                                const newMonth = month === 1 ? 12 : month - 1;
                                const newYear = month === 1 ? year - 1 : year;
                                setMonth(newMonth);
                                setYear(newYear);
                                setPage(0);
                            }}
                        >
                            ◀ Previous Month
                        </button>
                    </Col>

                    <Col md={4} className="text-center">
                        <strong>
                            {new Date(year, month - 1).toLocaleString("default", {
                                month: "long",
                                year: "numeric"
                            })}
                        </strong>
                    </Col>

                    <Col md={4} className="text-end">
                        {/* Disable Next if current month */}
                        {!(year === today.getFullYear() && month === today.getMonth() + 1) && (
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => {
                                    const newMonth = month === 12 ? 1 : month + 1;
                                    const newYear = month === 12 ? year + 1 : year;

                                    // prevent future
                                    const future = new Date(newYear, newMonth - 1);
                                    if (future <= new Date(today.getFullYear(), today.getMonth())) {
                                        setMonth(newMonth);
                                        setYear(newYear);
                                        setPage(0);
                                    }
                                }}
                            >
                                Next Month ▶
                            </button>
                        )}
                    </Col>
                </Row>


                <Card.Body>

                    {/* ================= DESKTOP TABLE ================= */}
                    <div className="table-responsive d-none d-md-block">
                        {filteredAttendance.length ? (
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
                                    {filteredAttendance.map((record) => (
                                        <tr key={record.id}>
                                            <td>{new Date(record.date).toLocaleDateString()}</td>
                                            <td>
                                                <span
                                                    className={`badge bg-${record.attendanceStatus === "PRESENT"
                                                        ? "success"
                                                        : STATUS_COLORS[record.attendanceStatus] || "danger"
                                                        }`}
                                                >
                                                    {record.attendanceStatus}
                                                </span>
                                            </td>
                                            <td>{formatTime(record.checkInTime, record.date)}
                                                {isLateAttendance(record) && (
                                                    <Badge bg="warning" className="ms-1">Late</Badge>
                                                )}

                                            </td>
                                            <td>{formatTime(record.checkOutTime, record.date)}</td>

                                            <td>
                                                {record.checkOutTime
                                                    ? formatHoursWorked(record.workedTime)
                                                    : formatHoursWorked(liveWorked[record.id])}
                                                <Timeline record={record} liveWorked={liveWorked} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <button
                                        className="btn btn-outline-secondary"
                                        disabled={page === 0}
                                        onClick={() => setPage(prev => prev - 1)}
                                    >
                                        Previous
                                    </button>

                                    <span>
                                        Page {page + 1} of {totalPages}
                                    </span>

                                    <button
                                        className="btn btn-outline-secondary"
                                        disabled={page + 1 >= totalPages}
                                        onClick={() => setPage(prev => prev + 1)}
                                    >
                                        Next
                                    </button>
                                </div>

                            </table>
                        ) : (
                            <p>No attendance records found</p>
                        )}

                    </div>

                    {/* ================= MOBILE CARDS ================= */}
                    <div className="d-block d-md-none">
                        {filteredAttendance.length === 0 && (
                            <p className="text-center text-muted">No attendance records found</p>
                        )}

                        {filteredAttendance.map((record) => (
                            <Card key={record.id} className="mb-3 shadow-sm">
                                <Card.Body>

                                    <div className="mb-2">
                                        <strong>Date:</strong>{" "}
                                        {new Date(record.date).toLocaleDateString()}
                                    </div>

                                    <div className="mb-2">
                                        <strong>Status:</strong>{" "}
                                        <span
                                            className={`badge bg-${record.attendanceStatus === "PRESENT"
                                                ? "success"
                                                : "danger"
                                                }`}
                                        >
                                            {record.attendanceStatus}
                                        </span>
                                    </div>

                                    <div className="mb-2">
                                        <strong>Check In:</strong>
                                        {formatTime(record.checkInTime, record.date)}
                                        {isLateAttendance(record) && (
                                            <Badge bg="warning" className="ms-1">Late</Badge>
                                        )}
                                    </div>

                                    <div className="mb-2">
                                        <strong>Check Out:</strong> {formatTime(record.checkOutTime, record.date)}
                                    </div>

                                    <div className="mb-2">
                                        <strong>Hours Worked:</strong>{" "}
                                        {record.checkOutTime
                                            ? formatHoursWorked(record.workedTime)
                                            : formatHoursWorked(liveWorked[record.id])}
                                    </div>

                                    <Timeline record={record} liveWorked={liveWorked} />

                                </Card.Body>
                            </Card>
                        ))}
                    </div>

                </Card.Body>
            </Card>

        </div>
    );
};

export default AttendanceHistory;

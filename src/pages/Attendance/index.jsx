
import { useEffect, useState } from "react";
import { Card, Table, Badge, ProgressBar } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { attendanceApi, holidayApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  isLateAttendance,
  isOnlineAttendance,
  getAttendanceBadgeStatus,
} from "../../utils/attendanceUtils";


import useAutoCheckout from "../../contexts/layout/AutoCheckout";
import { AttendanceFilters, useAttendanceFilters } from "../../components/attendance";
import WeeklySummaryOverall from "../../components/summary/WeeklySummaryOverall";
import MonthlySummaryOverall from "../../components/summary/MonthlySummaryOverall";
import WeeklySummarySelf from "../../components/summary/WeeklySummarySelf";
import MonthlySummarySelf from "../../components/summary/MonthlySummarySelf";
import { STATUS_COLORS } from "./constants";
import { getTimelineStatuses } from "../../utils/utils";
import './style.css'


const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const isTrulyAbsent = (rec) => {
  if (!rec) return false;

  if (rec.attendanceStatus) {
    return rec.attendanceStatus === "ABSENT";
  }

  return (
    !rec.checkInTime &&
    !rec.checkOutTime &&
    !rec.isHoliday &&
    rec.attendanceStatus !== "WEEKEND" &&
    rec.attendanceStatus !== "ON_LEAVE"
  );
};
const formatDayWithDate = (weekStart, index) => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + index);
  return {
    day: WEEK_DAYS[index],
    date: d.getDate(),
    fullDate: d.toISOString().split("T")[0]
  };
};


const getMonthLabelFromWeek = (weekStart) => {
  const d = new Date(weekStart);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
};

const isTodayDate = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
};


const getDateFromWeek = (weekStart, index) => {
  if (!weekStart) return null;

  // Force safe date parsing (UTC midnight)
  const d = new Date(`${weekStart}T00:00:00`);
  if (isNaN(d)) return null;

  d.setDate(d.getDate() + index);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const calculateLiveWorked = (rec) => {
  if (!rec) return null;

  if (rec.attendanceStatus !== "ONLINE") return null;

  const today = new Date().toISOString().split("T")[0];
  if (rec.date !== today) return null;

  if (!rec.checkInTime || rec.checkOutTime) return null;

  const start = new Date(`${rec.date}T${rec.checkInTime}`);
  if (isNaN(start)) return null;

  const now = new Date();
  const mins = Math.max(0, Math.floor((now - start) / 60000));

  return (
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:` +
    `${String(mins % 60).padStart(2, "0")}`
  );
};

const convertMinutesToHHMM = (mins = 0) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const getWorkedTimeForRecord = (rec) => {
  if (!rec) return null;

  if (rec.checkOutTime) {
    return convertMinutesToHHMM(rec.totalMinutes || 0);
  }

  return calculateLiveWorked(rec);
};

const isFutureWeek = (weekStart) => {
  const today = new Date().toISOString().split("T")[0];
  return weekStart > today;
};



const Attendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user.role;
  const employeeId = user.employeeId;
  const isAdmin = ["ROLE_ADMIN", "ROLE_HR", "ROLE_MANAGER"].includes(role);
  const [searchParams] = useSearchParams();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);



  const [attendanceData, setAttendanceData] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [forceReload, setForceReload] = useState(false);
  const [liveWorked, setLiveWorked] = useState({});
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [weeklyTimelineData, setWeeklyTimelineData] = useState([]);


  const statusParam = searchParams.get("status");
  const initialStatuses = statusParam
    ? statusParam.split(",")
    : ["ALL"];

  const [statusFilter, setStatusFilter] = useState(initialStatuses);

  const [searchName, setSearchName] = useState("");
  const [searchEmpId, setSearchEmpId] = useState("");
  const [holidays, setHolidays] = useState({});

  const [originalAttendanceData, setOriginalAttendanceData] = useState([]);
  const [originalWeeklyTimelineData, setOriginalWeeklyTimelineData] = useState([]);



  useAutoCheckout();

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    return d.toISOString().split("T")[0];
  }


  const getWeekDayIndex = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
  };


  const filteredAttendanceByStatus = useAttendanceFilters({
    data: attendanceData,
    isAdmin,
    statusFilter,
    searchName,
    searchEmpId,
    getRecordStatus: (rec) => {
      if (statusFilter.includes("ABSENT")) {
        return isTrulyAbsent(rec) ? "ABSENT" : null;
      }
      return getAttendanceBadgeStatus(rec);
    },
  });

  const filteredAttendanceData = filteredAttendanceByStatus;


  const groupByEmployee = (records) => {
    const map = {};

    records.forEach((r) => {
      if (r.isActive === false && isFutureWeek(weekStart)) return;

      if (!map[r.employeeId]) {
        map[r.employeeId] = {
          employeeId: r.employeeId,
          name: "Unknown",
          code: r.employeeCode ?? null,
          days: {},
        };
      }

      map[r.employeeId].name =
        [r.firstName, r.lastName].filter(Boolean).join(" ");

      map[r.employeeId].code = r.employeeCode;

      const idx = getWeekDayIndex(r.date);

      if (
        statusFilter.includes("ALL") ||
        (statusFilter.includes("ABSENT") && isTrulyAbsent(r)) ||
        statusFilter.includes(getAttendanceBadgeStatus(r))
      ) {
        map[r.employeeId].days[idx] = r;
      }

    });

    return Object.values(map);
  };



  const loadAttendance = async () => {
    try {
      let res;

      if (!isAdmin) {
        res = await attendanceApi.getMyAttendanceByDate(date);

        const data = Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        setAttendanceData(data);
        setOriginalAttendanceData(data);
        setTotalPages(1);
        return;
      }


      // Admin: get all attendance by date
      res = await attendanceApi.getAttendanceByDate(date);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];

      setAttendanceData(
        data.map((r) => ({ ...r, employeeName: `${r.firstName} ${r.lastName}` }))
      );
      setOriginalAttendanceData(data);

    } catch (e) {
      console.error("Attendance load failed", e);
      setAttendanceData([]);
      setOriginalAttendanceData([]);
      setTotalPages(1);
    }
  };



  const loadWeeklyTimeline = async () => {
    try {
      const res = await attendanceApi.getWeeklyTimeline(employeeId, weekStart);

      let data = res.data.data || [];

      if (isFutureWeek(weekStart)) {
        data = data.filter(r => r.isActive !== false);
      }

      setWeeklyTimelineData(data);
      setOriginalWeeklyTimelineData(data);

    } catch (e) {
      setWeeklyTimelineData([]);
      setOriginalWeeklyTimelineData([]);
    }
  };


  useEffect(() => {
    loadAttendance();
  }, [date, page, size, forceReload]);


  useEffect(() => {
    loadWeeklyTimeline();
  }, [weekStart]);


  const filteredWeeklyTimelineByStatus = useAttendanceFilters({
    data: weeklyTimelineData,
    isAdmin,
    statusFilter,
    searchName,
    searchEmpId,
    getRecordStatus: (rec) => {
      if (statusFilter.includes("ABSENT")) {
        return isTrulyAbsent(rec) ? "ABSENT" : null;
      }
      return getAttendanceBadgeStatus(rec);
    },
  });

  const filteredWeeklyTimelineData = filteredWeeklyTimelineByStatus;


  useEffect(() => {
    const h = () => setForceReload((p) => !p);
    window.addEventListener("attendance-updated", h);
    return () => window.removeEventListener("attendance-updated", h);
  }, []);

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const res = await holidayApi.getAllHolidays();
        const list = res.data || [];

        const map = {};
        list.forEach(h => {
          map[h.date] = h;
        });

        setHolidays(map);
      } catch (e) {
        console.error("Failed to load holidays", e);
      }
    };

    loadHolidays();
  }, []);


  useEffect(() => {
    updateLiveWorked();

    const interval = setInterval(updateLiveWorked, 60_000);

    return () => clearInterval(interval);
  }, [attendanceData]);


  useEffect(() => {
    const statusFromUrl = searchParams.get("status");

    if (statusFromUrl) {
      setStatusFilter(statusFromUrl.split(","));
    } else {
      setStatusFilter(["ALL"]);
    }
  }, [searchParams]);



  const exportExcel = (rows, fileName) => {
    if (!Array.isArray(rows)) return;

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(book, sheet, "Report");
    XLSX.writeFile(book, `${fileName}.xlsx`);
  };

  const exportPDF = (columns, rows, title, fileName) => {
    if (!rows?.length) return;

    const doc = new jsPDF("landscape"); // 👈 more width

    doc.setFontSize(14);
    doc.text(title, 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [columns],
      body: rows,

      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak", // prevent ugly breaks
        valign: "middle",
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
      },

      columnStyles: {
        0: { cellWidth: 40 }, // Employee
        1: { cellWidth: 25 }, // Code
        2: { cellWidth: 30 }, // Date
        3: { cellWidth: 25 }, // Status
        4: { cellWidth: 30 }, // Check In
        5: { cellWidth: 30 }, // Check Out
        6: { cellWidth: 35 }, // Worked Hours
      },

      theme: "grid",
    });

    doc.save(`${fileName}.pdf`);
  };



  const formatDailyAttendance = (data) =>
    data.map(r => ({
      Employee: r.firstName || "Self",
      Code: r.employeeCode || "-",
      Date: r.date,
      Status: getAttendanceBadgeStatus(r),
      "Check In": formatTime(r.checkInTime) || "--",
      "Check Out": formatTime(r.checkOutTime) || "--",
      "Worked Hours": r.workedTime || liveWorked[r.id] || "00:00"
    }));

  const formatWeeklyTimeline = (data) => {
    const employees = isAdmin
      ? groupByEmployee(data).filter(emp =>
        Object.values(emp.days).some(Boolean)
      )
      : data;


    return employees.map(emp => {
      const row = {
        Employee: emp.name,
        Code: emp.code
      };

      WEEK_DAYS.forEach((day, idx) => {
        const rec = emp.days[idx];
        row[day] = rec
          ? getAttendanceBadgeStatus(rec)
          : "-";
      });

      return row;
    });
  };


  const updateLiveWorked = () => {
    const today = new Date().toISOString().split("T")[0];

    const updated = {};

    attendanceData.forEach((rec) => {
      if (
        rec.attendanceStatus === "ONLINE" &&
        rec.date === today &&
        rec.checkInTime &&
        !rec.checkOutTime
      ) {
        const start = new Date(`${rec.date}T${rec.checkInTime}`);
        if (!isNaN(start)) {
          const mins = Math.max(
            0,
            Math.floor((Date.now() - start.getTime()) / 60000)
          );

          updated[rec.id] =
            `${String(Math.floor(mins / 60)).padStart(2, "0")}:` +
            `${String(mins % 60).padStart(2, "0")}`;
        }
      }
    });

    setLiveWorked(updated);
  };



  const TimelineBar = ({ rec }) => {
    if (rec.attendanceStatus !== "ONLINE") return null;

    const worked = rec.checkOutTime
      ? rec.workedTime
      : liveWorked[rec.id] || "00:00";

    const [hours, minutes] = worked.split(":").map(Number);
    const percent = Math.min(((hours * 60 + minutes) / (8 * 60)) * 100, 100);

    return (
      <div className="mt-1">
        <small className="text-muted">
          {formatTime(rec.checkInTime)} → Now
        </small>
        <ProgressBar now={percent} style={{ height: "4px", borderRadius: "10px" }} />
      </div>
    );
  };


  const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";

    const [h, m] = timeStr.split(":").map(Number);

    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  };



  const convertMinutesToHHMM = (mins = 0) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

  const formatHoursWorked = (hhmm) => {
    if (!hhmm) return "00 hrs 00 min";
    const [h, m] = hhmm.split(":");
    return `${h} hrs ${m} min`;
  };


  const DayRecord = ({ rec, dateStr }) => {
    const today = new Date().toISOString().split("T")[0];
    const isFuture = dateStr > today;

    const workedHHMM = getWorkedTimeForRecord(rec);

    const holiday = holidays?.[dateStr];

    if (holiday) {
      return (
        <>
          <Badge bg={STATUS_COLORS.HOLIDAY} className="mb-1">
            HOLIDAY
          </Badge>
          <div className="small text-muted">
            <b>Date: </b>{holiday.date}
          </div>
          <div className="small text-muted">
            🎉 {holiday.name}
          </div>
        </>
      );
    }

    if (rec?.isActive === false && dateStr > new Date().toISOString().split("T")[0]) {
      return <span className="text-muted">—</span>;
    }


    /* FUTURE DAY HANDLING */
    if (isFuture) {
      if (rec?.attendanceStatus === "WEEKEND") {
        return <Badge bg={STATUS_COLORS.WEEKEND}>WEEKEND</Badge>;
      }

      if (rec?.attendanceStatus === "HOLIDAY") {
        return <Badge bg={STATUS_COLORS.HOLIDAY}>HOLIDAY</Badge>;
      }

      return <span className="text-muted">—</span>;
    }

    /* PAST & TODAY */
    const statuses = getTimelineStatuses(rec, dateStr);

    return (
      <>
        {statuses
          .filter((s) => {
            if (statusFilter?.includes("ABSENT")) {
              return s === "ABSENT" && isTrulyAbsent(rec);
            }
            return true;
          })
          .map((s) => (
            <Badge key={s} bg={STATUS_COLORS[s]} className="me-1">
              {s.replace("_", " ")}
            </Badge>
          ))}


        {rec?.checkInTime && (
          <div className="small mt-1">
            ⏰ In: {formatTime(rec.checkInTime)}
            {isLateAttendance(rec) && (
              <Badge bg="warning" className="ms-1">Late</Badge>
            )}
            {rec.checkOutTime && <> <br />| Out: {formatTime(rec.checkOutTime)}</>}
          </div>
        )}



        {workedHHMM && (
          <div className="small">
            🕒 {formatHoursWorked(workedHHMM)}
          </div>
        )}



        {rec?.overtimeMinutes > 0 && (
          <div className="small text-primary">
            ⏱ OT: {formatHoursWorked(convertMinutesToHHMM(rec.overtimeMinutes))}
          </div>
        )}

        {isOnlineAttendance(rec) && (
          <div className="small text-info fw-bold">● Live</div>
        )}
      </>
    );
  };


  const WeeklyTimelineHorizontalTable = ({ data }) => {
    const employees = groupByEmployee(data);

    if (!employees.length) {
      return (
        <div className="text-center text-muted py-3">
          No records found
        </div>
      );
    }

    return (

      <div className="table-responsive d-none d-md-block">

        <Table bordered hover className="weekly-horizontal-table">
          <thead>
            <tr>
              <th>Employee</th>
              {WEEK_DAYS.map((_, idx) => {
                const { day, date, fullDate } = formatDayWithDate(weekStart, idx);
                const isToday = isTodayDate(fullDate);

                return (
                  <th
                    key={idx}
                    className={`text-center ${isToday ? "today-col" : ""}`}
                  >
                    <div>{day}</div>
                    <small className="text-muted">{date}</small>
                  </th>
                );
              })}
            </tr>
          </thead>


          <tbody>
            {employees.map((emp) => (
              <tr key={emp.employeeId}>
                <td>
                  <strong>{emp.name}</strong><br />
                  <small className="text-muted">{emp.code}</small>
                </td>

                {WEEK_DAYS.map((_, dayIdx) => {
                  const dateStr = getDateFromWeek(weekStart, dayIdx);
                  const isToday = isTodayDate(dateStr);

                  return (
                    <td
                      key={dayIdx}
                      className={`text-center align-middle ${isToday ? "today-col" : ""
                        }`}
                    >
                      <DayRecord
                        rec={emp.days[dayIdx]}
                        dateStr={dateStr}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

        </Table>
      </div>

    );
  };


  const WeeklyTimelineHorizontalCards = ({ data }) => {
    const employees = groupByEmployee(data);

    if (!employees.length) {
      return (
        <div className="text-center text-muted py-3">
          No records found
        </div>
      );
    }

    return (
      <div className="d-block d-md-none">
        {employees.map((emp) => (
          <Card key={emp.employeeId} className="mb-3">
            <Card.Body>
              <h6>
                {emp.name}
                <small className="text-muted ms-2">({emp.code})</small>
              </h6>

              {WEEK_DAYS.map((day, dayIdx) => (
                <div key={dayIdx} className="mb-3">
                  {(() => {
                    const { day, date } = formatDayWithDate(weekStart, dayIdx);
                    return (
                      <strong>
                        {day} <small className="text-muted">({date})</small>
                      </strong>
                    );
                  })()}

                  <DayRecord
                    rec={emp.days[dayIdx]}
                    dateStr={getDateFromWeek(weekStart, dayIdx)}
                  />
                </div>
              ))}
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  };


  const WeeklyTimelineSelfCards = ({ data, weekStart }) => {
    const weekMap = {};

    data.forEach((rec) => {
      const idx = getWeekDayIndex(rec.date);
      weekMap[idx] = rec;
    });

    return (
      <div className="d-block d-md-none">
        <Card className="mb-3">
          <Card.Body>
            <h6 className="mb-3">This Week</h6>

            {WEEK_DAYS.map((_, idx) => {
              const { day, date, fullDate } = formatDayWithDate(weekStart, idx);
              const isToday = isTodayDate(fullDate);

              return (
                <div
                  key={idx}
                  className={`mb-3 ${isToday ? "today-mobile" : ""}`}
                >
                  <strong>
                    {day} <small className="text-muted">({date})</small>
                  </strong>

                  <div className="mt-1">
                    <DayRecord
                      rec={weekMap[idx]}
                      dateStr={getDateFromWeek(weekStart, idx)}
                    />
                  </div>
                </div>
              )
            })}

          </Card.Body>
        </Card>
      </div>
    );
  };


  const WeeklyTimeline = ({ data = [], isAdmin }) => {
    const employees = isAdmin ? groupByEmployee(data) : data;

    if (!employees.length) {
      return (
        <div className="text-center text-muted py-3">
          No records found
        </div>
      );
    }


    if (isAdmin) {
      return (
        <>
          <div className="d-flex gap-2 mb-3">
            <button
              className="btn btn-outline-success btn-sm"
              onClick={() =>
                exportExcel(
                  formatWeeklyTimeline(filteredWeeklyTimelineData),
                  `weekly-timeline-${weekStart}`
                )
              }
            >
              Export Weekly Excel
            </button>

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => {
                const formatted = formatWeeklyTimeline(filteredWeeklyTimelineData);

                exportPDF(
                  Object.keys(formatted[0] || {}),
                  formatted.map(Object.values),
                  `Weekly Timeline - ${weekStart}`,
                  `weekly-timeline-${weekStart}`
                );
              }}
            >
              Export Weekly PDF
            </button>
          </div>

          <WeeklyTimelineHorizontalTable data={data} />
          <WeeklyTimelineHorizontalCards data={data} />
        </>
      );
    }

    return (
      <>
        <div className="d-none d-md-block">
          <Table bordered hover className="text-center">
            <thead>
              <tr>
                {WEEK_DAYS.map((_, idx) => {
                  const { day, date } = formatDayWithDate(weekStart, idx);
                  return (
                    <th key={idx} className="text-center">
                      <div>{day}</div>
                      <small className="text-muted">{date}</small>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              <tr>
                {WEEK_DAYS.map((_, idx) => (
                  <td key={idx}>
                    <DayRecord
                      rec={data.find(r => getWeekDayIndex(r.date) === idx)}
                      dateStr={getDateFromWeek(weekStart, idx)}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </Table>
        </div>

        <WeeklyTimelineSelfCards data={data} weekStart={weekStart} />
      </>
    );
  };

  const MobileAttendanceCards = ({ data }) => {
    if (!data.length) {
      return <div className="text-center text-muted">No records found</div>;
    }

    return (
      <div className="attendance-mobile-list d-md-none" >
        {data.map((r, i) => (
          <Card key={i} className="mobile-card mb-3 shadow-sm" onClick={() => navigate(`/employee/${r.employeeId}/monthly-attendance`)}>
            <Card.Body>
              {r.employeeName && (
                <div className="mb-2">
                  <strong>{r.employeeName}</strong>
                  <div className="text-muted small">{r.employeeCode}</div>
                </div>
              )}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>{new Date(r.date).toDateString()}</strong>
                <Badge bg={STATUS_COLORS[getAttendanceBadgeStatus(r)]}>
                  {getAttendanceBadgeStatus(r)}
                </Badge>

              </div>

              <div className="d-flex justify-content-between mb-2">
                <div>
                  <small className="text-muted">Check In</small>
                  <div>
                    {formatTime(r.checkInTime)}
                    {isLateAttendance(r) && <Badge bg="warning" className="ms-1">Late</Badge>}
                  </div>
                </div>

                <div>
                  <small className="text-muted">Check Out</small>
                  <div>{formatTime(r.checkOutTime)}</div>
                </div>
              </div>

              <div className="mb-2">
                <small className="text-muted">Worked Hours</small>
                <div>
                  {r.checkOutTime
                    ? formatHoursWorked(r.workedTime)
                    : formatHoursWorked(liveWorked[r.id])}
                </div>
                <TimelineBar rec={r} />
              </div>

              {isOnlineAttendance(r) && (
                <Badge bg="info">Online</Badge>
              )}

            </Card.Body>
          </Card>
        ))}
      </div>
    );
  };


  return (
    <div>
      {/* Header */}
      <div className="mb-3 filter-section">
        <h2 className="mb-2">
          {isAdmin ? "All Employees Attendance" : "My Attendance"}
        </h2>
        {/* DESKTOP FILTERS */}
        <div className="d-none d-md-flex align-items-center justify-content-end gap-2">
          <AttendanceFilters
            isAdmin={isAdmin}
            date={date}
            setDate={setDate}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchName={searchName}
            setSearchName={setSearchName}
            searchEmpId={searchEmpId}
            setSearchEmpId={setSearchEmpId}
          />

          <div className="d-flex gap-2 mb-3">
            <button
              className="btn btn-success btn-sm"
              onClick={() =>
                exportExcel(
                  formatDailyAttendance(originalAttendanceData),
                  `attendance-${date}-all`
                )
              }
            >
              Export All Excel
            </button>

            <button
              className="btn btn-danger btn-sm"
              onClick={() =>
                exportPDF(
                  Object.keys(formatDailyAttendance(filteredAttendanceData)[0] || {}),
                  formatDailyAttendance(filteredAttendanceData).map(Object.values),
                  `Attendance on ${date}`,
                  `attendance-${date}`
                )
              }
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* MOBILE COLLAPSIBLE FILTER */}
        <div className="d-md-none mb-3">
          <button
            className="btn btn-outline-light w-100"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          >
            {mobileFilterOpen ? "Hide Filters ▲" : "Show Filters ▼"}
          </button>

          <div className={`mobile-filter-collapse ${mobileFilterOpen ? "open" : ""}`}>
            <AttendanceFilters
              isAdmin={isAdmin}
              date={date}
              setDate={setDate}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              searchName={searchName}
              setSearchName={setSearchName}
              searchEmpId={searchEmpId}
              setSearchEmpId={setSearchEmpId}
            />

            <div className="d-flex flex-column gap-2 mt-2">
              <button
                className="btn btn-success btn-sm"
                onClick={() =>
                  exportExcel(
                    formatDailyAttendance(originalAttendanceData),
                    `attendance-${date}-all`
                  )
                }
              >
                Export All Excel
              </button>

              <button
                className="btn btn-danger btn-sm"
                onClick={() =>
                  exportPDF(
                    Object.keys(formatDailyAttendance(filteredAttendanceData)[0] || {}),
                    formatDailyAttendance(filteredAttendanceData).map(Object.values),
                    `Attendance on ${date}`,
                    `attendance-${date}`
                  )
                }
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>




      {/* Attendance Table */}
      <Card className="attendance-table d-none d-md-block">
        <Card.Header>Attendance on {date}</Card.Header>
        <Card.Body>
          <Table hover>
            <thead>
              <tr>
                {isAdmin && <th>Employee</th>}
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours Worked</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendanceData.length === 0 ? (
                <tr><td colSpan={isAdmin ? 5 : 4} className="text-center text-muted">No records found</td></tr>
              ) : filteredAttendanceData.map((r, i) => (
                <tr key={i} onClick={() => navigate(`/employee/${r.employeeId}/monthly-attendance`)}>
                  {isAdmin && (
                    <td>
                      <strong>{r.employeeName}</strong><br />
                      <small>{r.employeeCode}</small>
                    </td>
                  )}
                  <td>
                    {(() => {
                      const status = getAttendanceBadgeStatus(r);

                      return (
                        <Badge bg={STATUS_COLORS[status] || "secondary"}>
                          {status.replace("_", " ")}
                        </Badge>
                      );
                    })()}
                  </td>


                  <td>
                    {formatTime(r.checkInTime)}
                    {isLateAttendance(r) && <Badge bg="warning" className="ms-2">Late</Badge>}
                  </td>

                  <td>{formatTime(r.checkOutTime)}</td>
                  <td>
                    {r.checkOutTime ? formatHoursWorked(r.workedTime) : formatHoursWorked(liveWorked[r.id])}
                    <TimelineBar rec={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      <MobileAttendanceCards data={filteredAttendanceData} />

      <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
        <button className="btn btn-outline-light" onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; })}>← Previous Week</button>
        <strong>Week Starting: {weekStart}</strong>
        <button className="btn btn-outline-light" onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })}>Next Week →</button>
      </div>
      <Card className="mt-3 p-3">
        <div className="text-center mb-2">
          <h5 className="mb-0">Weekly Timeline</h5>
          <div className="text-muted fw-semibold">
            {getMonthLabelFromWeek(weekStart)}
          </div>
        </div>

        <WeeklyTimeline
          data={filteredWeeklyTimelineData}
          isAdmin={isAdmin}
        />
      </Card>


      {isAdmin ? (
        <>
          <WeeklySummaryOverall weekStart={weekStart} />
          <MonthlySummaryOverall />
        </>
      ) : (
        <>
          <WeeklySummarySelf weekStart={weekStart} />
          <MonthlySummarySelf employeeId={employeeId} />
        </>
      )}

    </div>
  );
};

export default Attendance;
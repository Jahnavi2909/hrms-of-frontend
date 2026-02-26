import { ATTENDANCE_STATUS, UI_STATUS } from "../pages/Attendance/constants";


export const isToday = (date) =>
  date === new Date().toISOString().split("T")[0];

/**
 * ONLINE = checked-in today but not checked out
 */
export const isOnlineAttendance = (rec) =>
  isToday(rec?.date) &&
  !!rec?.checkInTime &&
  !rec?.checkOutTime;

/**
 * LATE = backend-calculated flag
 */
export const isLateAttendance = (rec) => Boolean(rec?.isLate);

/**
 * FINAL STATUS shown in tables
 */
export const getAttendanceBadgeStatus = (rec) => {
  if (!rec) return ATTENDANCE_STATUS.ABSENT;

  if (
    rec.attendanceStatus === ATTENDANCE_STATUS.HOLIDAY ||
    rec.attendanceStatus === ATTENDANCE_STATUS.WEEKEND ||
    rec.attendanceStatus === ATTENDANCE_STATUS.LEAVE
  ) {
    return rec.attendanceStatus;
  }

  if (isOnlineAttendance(rec)) return UI_STATUS.ONLINE;
  if (isLateAttendance(rec)) return UI_STATUS.LATE;

  return rec.attendanceStatus || ATTENDANCE_STATUS.ABSENT;
};

/**
 * Weekly Timeline (multiple badges per day)
 */
export const getTimelineStatuses = (rec, dateStr) => {
  if (!rec) return [ATTENDANCE_STATUS.ABSENT];

  if (
    rec.attendanceStatus === ATTENDANCE_STATUS.HOLIDAY ||
    rec.attendanceStatus === ATTENDANCE_STATUS.WEEKEND ||
    rec.attendanceStatus === ATTENDANCE_STATUS.LEAVE
  ) {
    return [rec.attendanceStatus];
  }

  const statuses = [];

  if (isOnlineAttendance(rec)) statuses.push(UI_STATUS.ONLINE);
  if (isLateAttendance(rec)) statuses.push(UI_STATUS.LATE);

  statuses.push(rec.attendanceStatus || ATTENDANCE_STATUS.PRESENT);

  return [...new Set(statuses)];
};

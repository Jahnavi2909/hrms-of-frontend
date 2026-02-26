import { isLateAttendance } from "./attendanceUtils";

export const getTimelineStatuses = (rec, dateStr) => {
  if (!rec) return ["ABSENT"];

  if (rec.attendanceStatus === "HOLIDAY") return ["HOLIDAY"];
  if (rec.attendanceStatus === "WEEKEND") return ["WEEKEND"];
  if (rec.attendanceStatus === "LEAVE") return ["LEAVE"];

  const statuses = [];

  if (isLateAttendance(rec)) {
    statuses.push("LATE");
  }


  if (rec.checkInTime && !rec.checkOutTime) {
    statuses.push("ONLINE");
  }

  if (rec.checkInTime && rec.checkOutTime) {
    statuses.push("PRESENT");
  }


  if (!statuses.length) {
    statuses.push("ABSENT");
  }

  return statuses;
};

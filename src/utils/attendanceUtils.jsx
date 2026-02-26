
export const isToday = (dateStr) => {
  const today = new Date().toISOString().split("T")[0];
  return dateStr?.split("T")[0] === today;
};

export const isAbsentAttendance = (rec) =>
  rec?.attendanceStatus === "ABSENT";


export const isOnlineAttendance = (rec) =>
  isToday(rec?.date) &&
  rec?.checkInTime &&
  !rec?.checkOutTime;

export const isLateAttendance = (record) => {
  if (!record?.checkInTime) return false;

  const [hours, minutes] = record.checkInTime.split(":").map(Number);
  const checkInDate = new Date();
  checkInDate.setHours(hours, minutes, 0, 0);

  const lateThreshold = new Date();
  lateThreshold.setHours(9, 40, 0, 0); 

  return checkInDate > lateThreshold;
};


export const getAttendanceBadgeStatus = (rec) => {
  if (!rec) return "ABSENT";


  if (rec.attendanceStatus === "HOLIDAY") return "HOLIDAY";
  if (rec.attendanceStatus === "WEEKEND") return "WEEKEND";
  if (rec.attendanceStatus === "LEAVE") return "LEAVE";

  if (rec.checkInTime && !rec.checkOutTime) return "ONLINE";

  if (rec.late) return "LATE";

  if (rec.checkInTime && rec.checkOutTime) return "PRESENT";

  return "ABSENT";
};


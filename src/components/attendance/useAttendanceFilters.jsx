import { useMemo } from "react";

const normalize = (val) =>
  (val || "").toString().toLowerCase().trim();

export const useAttendanceFilters = ({
  data = [],
  isAdmin,
  statusFilter = [],
  searchName,
  searchEmpId,
  getRecordStatus,
}) => {
  return useMemo(() => {
    return data.filter((r) => {
      const recordStatus = getRecordStatus(r);

      const matchesStatus =
        statusFilter.includes("ALL") ||
        statusFilter.includes(recordStatus);

      if (!matchesStatus) return false;

      if (isAdmin && searchName) {
        const name = `${r.firstName || ""} ${r.lastName || ""}`;
        if (!normalize(name).includes(normalize(searchName))) return false;
      }

      if (isAdmin && searchEmpId) {
        const code = r.employeeCode || r.employeeId || "";
        if (!normalize(code).includes(normalize(searchEmpId))) return false;
      }

      return true;
    });
  }, [data, isAdmin, statusFilter, searchName, searchEmpId, getRecordStatus]);
};

import { Form } from "react-bootstrap";
import { FaCalendarAlt } from "react-icons/fa";


const AttendanceFilters = ({
  isAdmin,
  date,
  setDate,
  statusFilter,
  setStatusFilter,
  searchName,
  setSearchName,
  searchEmpId,
  setSearchEmpId,
}) => {
  return (
    <div className="d-flex justify-content-end align-items-center mb-3 flex-wrap gap-2">

      <div className="d-flex gap-2 flex-wrap">

        {/* Date */}
        {date && (
          <Form.Group className="d-flex flex-row align-items-center">
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Form.Group>
        )}
       

        {/* Admin-only filters */}
        {isAdmin && (
          <>
            <Form.Control
              type="text"
              placeholder="Search Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ width: 180 }}
            />

            <Form.Control
              type="text"
              placeholder="Emp ID / Code"
              value={searchEmpId}
              onChange={(e) => setSearchEmpId(e.target.value)}
              style={{ width: 160 }}
            />
             <Form.Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 150 }}
        >
          <option value="ALL">All</option>
          <option value="PRESENT">Present</option>
          <option value="LATE">Late</option>
          <option value="ONLINE">Online</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="LEAVE">Leave</option>
          <option value="ABSENT">Absent</option>
        </Form.Select>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceFilters;

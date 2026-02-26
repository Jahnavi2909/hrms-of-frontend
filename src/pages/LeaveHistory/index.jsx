import { useEffect, useState } from "react";
import { Card, Badge, Button, Form, Alert, Collapse } from "react-bootstrap";
import { FaCalendarAlt } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { leaveApi } from "../../services/api";
import { useParams } from "react-router-dom";
import EmployeeProfileInfo from "../../contexts/layout/EmployeeProfileInfo";


const statusVariant = (status) => {
    switch (status) {
        case "APPROVED":
            return "success";
        case "REJECTED":
            return "danger";
        default:
            return "warning";
    }
};


const LeaveHistory = ({ employeeId }) => {
    const { user } = useAuth();
    const { id } = useParams();
    const empId = id || user?.employeeId;

    const [leaves, setLeaves] = useState([]);
    const [dateFilter, setDateFilter] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [expandedId, setExpandedId] = useState(null);


    const isAdmin =
        user.role === "ROLE_ADMIN" ||
        user.role === "ROLE_MANAGER" ||
        user.role === "ROLE_HR";

    const loadLeaves = async () => {
        try {
            const res = await leaveApi.getByEmployee(empId);
            setLeaves(res?.data?.data || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load leave history");
        }
    };

    useEffect(() => {
        loadLeaves();
    }, []);

    const handleAction = async (leaveId, action) => {
        try {
            await leaveApi.actOnLeave(leaveId, {
                action,
                comment: `${action} by ${user.firstName}`,
                actorEmployeeId: user.employeeId,
            });
            setMessage(`Leave ${action.toLowerCase()} successfully`);
            loadLeaves();
        } catch (err) {
            console.error(err);
            setError("Action failed");
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };


    const filteredLeaves = leaves.filter((l) => {
        if (!dateFilter) return true;
        const d = new Date(dateFilter);
        return d >= new Date(l.startDate) && d <= new Date(l.endDate);
    });

    return (
        <div>
            <EmployeeProfileInfo empId={empId} />
            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Leave History</h4>
                <Form.Group className="d-flex align-items-center">
                    <Form.Label className="me-2 mb-0">
                        <FaCalendarAlt /> Date
                    </Form.Label>
                    <Form.Control
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </Form.Group>
            </div>

            <Card>
                <Card.Body>

                    {/* ================= DESKTOP TABLE ================= */}
                    <div className="table-responsive d-none d-md-block">
                        {filteredLeaves.length ? (
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        {isAdmin && <th>Employee</th>}
                                        <th>Type</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>Days</th>
                                        <th>Status</th>
                                        {isAdmin && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeaves.map((l) => (
                                        <>
                                            <tr
                                                key={l.id}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => toggleExpand(l.id)}
                                            >
                                                {isAdmin && (
                                                    <td>
                                                        {l.employeeName}
                                                        <br />
                                                        <small>{l.employeeCode}</small>
                                                    </td>
                                                )}
                                                <td>{l.leaveType}</td>
                                                <td>{l.startDate}</td>
                                                <td>{l.endDate}</td>
                                                <td>{l.days}</td>
                                                <td>
                                                    <Badge bg={statusVariant(l.status)}>
                                                        {l.status}
                                                    </Badge>
                                                </td>
                                                {isAdmin && (
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

                                            <tr>
                                                <td colSpan={isAdmin ? 7 : 6} className="p-0">
                                                    <Collapse in={expandedId === l.id}>
                                                        <div className="p-3 bg-light border-top">
                                                            <div><strong>Reason:</strong> {l.reason || "--"}</div>
                                                            <div><strong>Applied On:</strong> {l.appliedOn || "--"}</div>
                                                            <div><strong>Comment:</strong> {l.managerComment || "--"}</div>
                                                            {isAdmin && (
                                                                <div><strong>Action By:</strong> {l.managerComment || "--"}</div>
                                                            )}
                                                        </div>
                                                    </Collapse>
                                                </td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>

                            </table>
                        ) : (
                            <p className="text-muted text-center">
                                No leave records found
                            </p>
                        )}
                    </div>

                    {/* ================= MOBILE CARDS ================= */}
                    <div className="d-block d-md-none">
                        {filteredLeaves.map((l) => (
                            <Card
                                key={l.id}
                                className="mb-3 shadow-sm"
                                onClick={() => toggleExpand(l.id)}
                                style={{ cursor: "pointer" }}
                            >
                                <Card.Body>

                                    {isAdmin && (
                                        <div className="mb-2">
                                            <strong>Employee:</strong>{" "}
                                            {l.employeeName} ({l.employeeCode})
                                        </div>
                                    )}

                                    <div><strong>Leave Type:</strong> {l.leaveType}</div>
                                    <div><strong>From:</strong> {l.startDate}</div>
                                    <div><strong>To:</strong> {l.endDate}</div>
                                    <div><strong>Days:</strong> {l.days}</div>

                                    <div className="mt-2">
                                        <Badge bg={statusVariant(l.status)}>
                                            {l.status}
                                        </Badge>
                                    </div>

                                    <Collapse in={expandedId === l.id}>
                                        <div className="mt-3 border-top pt-2">
                                            <div><strong>Reason:</strong> {l.reason || "--"}</div>
                                            <div><strong>Applied On:</strong> {l.appliedOn || "--"}</div>
                                            <div><strong>Comment:</strong> {l.managerComment || "--"}</div>

                                            {isAdmin && l.status === "PENDING" && (
                                                <div className="d-flex gap-2 mt-2">
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
                                                </div>
                                            )}
                                        </div>
                                    </Collapse>

                                </Card.Body>
                            </Card>
                        ))}
                    </div>


                </Card.Body>
            </Card>
        </div>
    );
};

export default LeaveHistory;

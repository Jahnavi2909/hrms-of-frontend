import { useEffect, useState } from "react";
import { Card, Col, Row } from "react-bootstrap";
import {
    FaCalendarAlt,
    FaEnvelope,
    FaIdCard,
    FaMapMarkerAlt,
    FaPhone,
    FaUserTie,
} from "react-icons/fa";
import { employeeApi } from "../../services/api";

const EmployeeProfileInfo = ({ empId }) => {

    const [employee, setEmployee] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const empRes = await employeeApi.getById(empId);
                setEmployee(empRes.data.data);
            } catch {
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        if (empId) fetchData();
    }, [empId]);

    if (loading) {
        return (
            <Card className="mb-4">
                <Card.Body>Loading profile...</Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="mb-4">
                <Card.Body className="text-danger">{error}</Card.Body>
            </Card>
        );
    }



    return (
        <Card className="mb-4">
            <Card.Header>Employee Profile</Card.Header>
            <Card.Body>
                <h5>
                    {employee.firstName} {employee.lastName}
                </h5>
                <p className="text-muted">{employee.designation}</p>

                <Row className="mt-3">
                    <Col md={6}>
                        <p>
                            <FaIdCard className="me-2" />
                            Employee ID: {employee.employeeId || "N/A"}
                        </p>
                        <p>
                            <FaUserTie className="me-2" />
                            {employee.departmentName || "N/A"}
                        </p>
                        <p>
                            <FaEnvelope className="me-2" />
                            {employee.email || "N/A"}
                        </p>
                    </Col>

                    <Col md={6}>
                        <p>
                            <FaPhone className="me-2" />
                            {employee.phone || "N/A"}
                        </p>
                        <p>
                            <FaCalendarAlt className="me-2" />
                            Joining:{" "}
                            {employee.joiningDate
                                ? new Date(employee.joiningDate).toLocaleDateString()
                                : "N/A"}
                        </p>
                        <p>
                            <FaMapMarkerAlt className="me-2" />
                            {employee.address || "N/A"}
                        </p>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default EmployeeProfileInfo;

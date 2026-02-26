import { useState, useEffect } from "react";
import { Card, Form, Button, Alert, Container } from "react-bootstrap";
import './style.css';
import { departmentApi } from "../../services/api";


const patterns = {
    name: /^[A-Za-z]{2,30}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[A-Za-z]{2,}$/,
    phone: /^[6-9]\d{9}$/,
    employeeId: /^EMP-\d{3,5}$/,
    password: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
    salary: /^[0-9]{3,8}$/,
};


const EmployeeForm = ({ editingEmployee, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        departmentName: "",
        designation: "",
        joiningDate: "",
        dateOfBirth: "",
        salary: "",
        employeeId: "",
        address: "",
        password: "",
        role: "EMPLOYEE",
    });

    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await departmentApi.getAll();
                setDepartments(response.data.data || []);
            } catch (err) {
                console.error("Failed to fetch departments", err);
            }
        };

        fetchDepartments();
    }, []);



    useEffect(() => {
        if (editingEmployee) {
            setFormData({
                firstName: editingEmployee.firstName || "",
                lastName: editingEmployee.lastName || "",
                email: editingEmployee.email || "",
                phone: editingEmployee.phone || "",
                departmentName: editingEmployee.departmentName || "",
                designation: editingEmployee.designation || "",
                employeeId: editingEmployee.employeeId || "",
                salary: editingEmployee.salary || "",
                joiningDate: editingEmployee.joiningDate ? editingEmployee.joiningDate.split("T")[0] : "",
                dateOfBirth: editingEmployee.dateOfBirth ? editingEmployee.dateOfBirth.split("T")[0] : "",
                password: "",
                address: editingEmployee.address || "",
                role: editingEmployee.role || "EMPLOYEE",
            });
        }
    }, [editingEmployee]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: "" });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        if (!validate()) return;

        try {
            await onSubmit(formData);
            setMessage(editingEmployee ? "Employee updated successfully!" : "Employee added successfully!");
        } catch (err) {
            setError(err.response.data.message
                || "Failed to save employee.");
        }
    };


    const validate = () => {
        const newErrors = {};

        if (!patterns.name.test(formData.firstName))
            newErrors.firstName = "First name must contain only letters (min 2)";

        if (!patterns.name.test(formData.lastName))
            newErrors.lastName = "Last name must contain only letters (min 2)";

        if (!patterns.email.test(formData.email))
            newErrors.email = "Enter a valid email address";

        if (!patterns.phone.test(formData.phone))
            newErrors.phone = "Enter valid 10-digit mobile number";

        if (!patterns.employeeId.test(formData.employeeId))
            newErrors.employeeId = "Employee ID must be like EMP-101";

        if (!patterns.password.test(formData.password))
            newErrors.password =
                "Password must contain uppercase, lowercase, number & special character";

        if (!patterns.salary.test(formData.salary))
            newErrors.salary = "Salary must be numeric (min 3 digits)";

        if (!formData.departmentName)
            newErrors.departmentName = "Department is required";

        if (!formData.designation)
            newErrors.designation = "Designation is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    return (
        <Container className="d-flex justify-content-center">
            <Card style={{ maxWidth: '1500px', width: '100%' }} className="employee-form-card mb-4">
                <Card.Header>{editingEmployee ? "Edit Employee" : "Add Employee"}</Card.Header>
                <Card.Body>
                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form noValidate onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label>First Name</Form.Label>
                                <Form.Control name="firstName" value={formData.firstName} onChange={handleChange} required pattern="[A-Za-z]{2,30}" isInvalid={!!errors.firstName} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.firstName}
                                </Form.Control.Feedback>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Last Name</Form.Label>
                                <Form.Control name="lastName" value={formData.lastName} onChange={handleChange} isInvalid={!!errors.lastName}
                                    required />
                                <Form.Control.Feedback type="invalid">
                                    {errors.lastName}
                                </Form.Control.Feedback>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required isInvalid={!!errors.email} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.email}
                                </Form.Control.Feedback>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="HR">HR</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="TEAM_LEADER">Team_Leader</option>
                                </Form.Select>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Phone</Form.Label>
                                <Form.Control name="phone" value={formData.phone} onChange={handleChange} pattern="[6-9][0-9]{9}"
                                    isInvalid={!!errors.phone} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.phone}
                                </Form.Control.Feedback>
                            </div>


                            <div className="col-md-6 mb-3">
                                <Form.Label>Department</Form.Label>
                                {!departments.length && <small>Loading departments...</small>}
                                <Form.Select
                                    name="departmentName"
                                    value={formData.departmentName}
                                    onChange={handleChange}
                                    isInvalid={!!errors.departmentName}
                                    required
                                >
                                    <option value="">-- Select Department --</option>

                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.name}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </Form.Select>

                                <Form.Control.Feedback type="invalid">
                                    {errors.departmentName}
                                </Form.Control.Feedback>
                            </div>

                            <div className="col-md-6 mb-3">
                                <Form.Label>Designation</Form.Label>
                                <Form.Control name="designation" value={formData.designation} onChange={handleChange} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Joining Date</Form.Label>
                                <Form.Control type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Employee Id</Form.Label>
                                <Form.Control type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} pattern="EMP-\d{3,5}"
                                    isInvalid={!!errors.employeeId} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.employeeId}
                                </Form.Control.Feedback>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Date of birth</Form.Label>
                                <Form.Control type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Salary</Form.Label>
                                <Form.Control type="number" name="salary" value={formData.salary} onChange={handleChange} isInvalid={!!errors.salary} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.salary}
                                </Form.Control.Feedback>
                            </div>

                            <div className="col-md-6 mb-2">
                                <Form.Label>Password</Form.Label>
                                <Form.Control type="password" name="password" value={formData.password || ""} onChange={handleChange} required isInvalid={!!errors.password} />
                                <Form.Text muted>
                                    Min 8 chars, uppercase, lowercase, number & symbol
                                </Form.Text>
                                <Form.Control.Feedback type="invalid">
                                    {errors.password}
                                </Form.Control.Feedback>
                            </div>

                            <div className="col-md-6 mb-2">
                                <Form.Label>Address</Form.Label>
                                <Form.Control type="text" name="address" value={formData.address || ""} onChange={handleChange} required />
                            </div>

                        </div>
                        <div className="d-flex">
                            <Button type="submit" variant="primary" className="me-2">
                                {editingEmployee ? "Update" : "Add"} Employee
                            </Button>
                            {editingEmployee && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default EmployeeForm;

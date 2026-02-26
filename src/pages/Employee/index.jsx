import { useState, useEffect } from "react";
import { Button, Card, Container, Table, Form, Collapse } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { FaEdit, FaTrash, FaUserPlus } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { employeeApi } from "../../services/api";
import EmployeeForm from "./EmployeeForm";
import "./style.css";
import { useNavigate, useParams } from "react-router-dom";

const Employee = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const isAdminOrHr = ['ROLE_ADMIN', 'ROLE_HR', "ROLE_MANAGER"].includes(user?.role);

    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [openForm, setOpenForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ACTIVE")

    const [originalEmployees, setOriginalEmployees] = useState([]);


    const navigate = useNavigate();

    useEffect(() => {
        fetchEmployees();
    }, [id]);

    const fetchEmployees = async () => {
        try {
            let response;

            if (id) {
                response = await employeeApi.getEmployeeByDepartment(id);
            } else {

                if (statusFilter === "ACTIVE") {
                    response = await employeeApi.getActiveEmployees();
                } else {
                    response = await employeeApi.getInactiveEmployees();
                }
                if (response.data?.data) setEmployees(response.data.data);

            }

            if (response.data?.data) {
                setEmployees(response.data.data);
                setOriginalEmployees(response.data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [statusFilter, id]);


    const exportExcel = (data, fileName) => {
        if (!Array.isArray(data)) return;

        const worksheetData = data.map(emp => ({
            "Employee Name": `${emp.firstName} ${emp.lastName}`,
            "Employee Id": emp.employeeCode,
            "Email": emp.email,
            "Designation": emp.designation,
            "Department": emp.departmentName,
            "Status": emp.isActive ? "ACTIVE" : "INACTIVE",
            "Join Date": emp.joiningDate
                ? new Date(emp.joiningDate).toLocaleDateString()
                : "N/A"
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };


    const exportPDF = (data, fileName) => {
        if (!Array.isArray(data)) return;

        const doc = new jsPDF();
        doc.text("Employee Report", 14, 15);

        autoTable(doc, {
            startY: 20,
            head: [[
                "Name",
                "Employee ID",
                "Email",
                "Designation",
                "Department",
                "Status",
                "Join Date"
            ]],
            body: data.map(emp => [
                `${emp.firstName} ${emp.lastName}`,
                emp.employeeCode,
                emp.email,
                emp.designation,
                emp.departmentName,
                emp.isActive ? "ACTIVE" : "INACTIVE",
                emp.joiningDate
                    ? new Date(emp.joiningDate).toLocaleDateString()
                    : "N/A"
            ])
        });

        doc.save(`${fileName}.pdf`);
    };


    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setOpenForm(true);
    };

    const handleCancel = () => {
        setEditingEmployee(null);
        setOpenForm(false);
    };

    const handleSubmit = async (data) => {
        if (editingEmployee) {
            await employeeApi.update(editingEmployee.id, data);
        } else {
            await employeeApi.create(data);
        }
        fetchEmployees();
        handleCancel();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        await employeeApi.delete(id);
        setEmployees(employees.filter(e => e.id !== id));
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container >
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Employee Management</h2>
                {isAdminOrHr && (
                    <Button variant="primary" onClick={() => setOpenForm(!openForm)}>
                        <FaUserPlus className="me-2" />
                        {openForm ? "Close Form" : "Add Employee"}
                    </Button>
                )}
            </div>

            <Collapse in={openForm}>
                <div>
                    <EmployeeForm
                        editingEmployee={editingEmployee}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                    />
                </div>
            </Collapse>

            <Card>
                <Card.Body>
                    <div className="mb-3 d-flex justify-content-between align-items-center">
                        <div style={{ width: '200px' }}>
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ACTIVE">Active Employees</option>
                                <option value="INACTIVE">Inactive Employees</option>
                            </Form.Select>
                        </div>
                        <div style={{ width: '300px' }}>
                            <Form.Control
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mb-3">
                        <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => exportExcel(originalEmployees, "employees-all")}
                        >
                            Export All Excel
                        </Button>

                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => exportPDF(originalEmployees, "employees-all")}
                        >
                            Export All PDF
                        </Button>

                        <Button
                            variant="success"
                            size="sm"
                            onClick={() => exportExcel(filteredEmployees, "employees-filtered")}
                        >
                            Export Filtered Excel
                        </Button>

                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => exportPDF(filteredEmployees, "employees-filtered")}
                        >
                            Export Filtered PDF
                        </Button>
                    </div>


                    <div className="table-responsive desktop-table">
                        <Table hover className="align-middle table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Position</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Join Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length ? (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => navigate(`/employees/${emp.id}`)}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <img
                                                        src={
                                                            emp.avatar && emp.avatar.trim() !== ""
                                                                ? emp.avatar
                                                                : "/profile.jpg"
                                                        }
                                                        alt="Avatar"
                                                        className="avatar mb-2"
                                                        style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", marginRight: "10px" }}
                                                        onError={(e) => {
                                                            e.currentTarget.src = "/profile.jpg";
                                                        }}
                                                    />

                                                    <div className="employee-text">
                                                        <div className="name">
                                                            {emp.firstName} {emp.lastName}
                                                        </div>
                                                        <small className="email">{emp.email}</small>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{emp.designation}</td>
                                            <td>{emp.departmentName}</td>
                                            <td>{emp.isActive ? "ACTIVE" : "INACTIVE"}</td>
                                            <td>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}</td>
                                            <td>
                                                <div className="d-flex">
                                                    <Button variant="link" size="sm" className="text-primary p-0 me-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(emp);
                                                        }}
                                                        disabled={!isAdminOrHr}
                                                    >
                                                        <FaEdit />
                                                    </Button>
                                                    <Button variant="link" size="sm" className="text-danger p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(emp.id)
                                                        }
                                                        }
                                                        disabled={!isAdminOrHr}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">No employees found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="mobile-list d-md-none">
                        {filteredEmployees.length ? (
                            filteredEmployees.map(emp => (
                                <div className="mobile-card" key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)}>

                                    <div className="field">
                                        <img
                                            src={
                                                emp.avatar && emp.avatar.trim() !== ""
                                                    ? emp.avatar
                                                    : "/profile.jpg"
                                            }
                                            alt="Avatar"
                                            className="avatar mb-2"

                                            onError={(e) => {
                                                e.currentTarget.src = "/profile.jpg";
                                            }}
                                        />

                                        <div className="label">Employee</div>
                                        <div className="value">{emp.firstName} {emp.lastName}</div>
                                        <div className="value text-muted" style={{ fontSize: "12px" }}>{emp.email}</div>
                                    </div>

                                    <div className="field">
                                        <div className="label">Position</div>
                                        <div className="value">{emp.designation}</div>
                                    </div>

                                    <div className="field">
                                        <div className="label">Department</div>
                                        <div className="value">{emp.departmentName}</div>
                                    </div>

                                    <div className="field">
                                        <div className="label">Status</div>
                                        <div className="value">{emp.isActive ? "ACTIVE" : "INACTIVE"}</div>
                                    </div>

                                    <div className="field">
                                        <div className="label">Join Date</div>
                                        <div className="value">
                                            {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "N/A"}
                                        </div>
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    <div className="actions">
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-primary p-0"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit(emp)
                                            }
                                            }
                                        >
                                            <FaEdit />
                                        </Button>

                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-danger p-0"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(emp.id)
                                            }}
                                        >
                                            <FaTrash />
                                        </Button>
                                    </div>

                                </div>
                            ))
                        ) : (
                            <p className="text-center py-3">No employees found.</p>
                        )}
                    </div>

                </Card.Body>
            </Card>
        </Container>
    );
};

export default Employee;

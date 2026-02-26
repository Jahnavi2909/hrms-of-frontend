import { useEffect, useState } from "react";
import { employeeApi, wfhApi } from "../services/api";

const WfhSettings = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const res = await employeeApi.getAllEmployee();
            setEmployees(res.data.data || res.data);
        } catch (err) {
            alert("Failed to load employees");
        }
    };

    const enableWFHForEmployee = async () => {
        if (!selectedEmployee) {
            alert("Please select an employee");
            return;
        }

        await wfhApi.enableForEmployee(selectedEmployee);
        alert("WFH enabled for selected employee");
    };

    return (
        <div className="card p-3">
            <h4>Work From Home Settings</h4>
            <div className="mb-3 d-flex flex-row flex-wrap align-items-end gap-3">
                <button
                    className="btn btn-success"
                    onClick={() =>
                        wfhApi.enableGlobal().then(() =>
                            alert("WFH enabled for all employees")
                        )
                    }
                >
                    Enable WFH for All Employees
                </button>

                <hr />
                <div>
                    <label>Select Employee</label>
                    <select
                        className="form-control mb-2"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                        <option value="">-- Select Employee --</option>
                        {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName} ({emp.employeeId})
                            </option>
                        ))}
                    </select>

                    <button
                        className="btn btn-primary mb-3"
                        onClick={enableWFHForEmployee}
                    >
                        Enable WFH for Selected Employee
                    </button>
                </div>
                <hr />

                <button
                    className="btn btn-danger"
                    onClick={() =>
                        wfhApi.disableAll().then(() => alert("WFH disabled"))
                    }
                >
                    Disable WFH
                </button>
            </div>
        </div>
    );
};

export default WfhSettings;

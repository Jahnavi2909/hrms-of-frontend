
import { useState, useEffect } from "react";
import { Card, Form, Table, Button, Alert, Badge, Collapse, Modal } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useAuth } from "../../contexts/AuthContext";
import { taskApi, employeeApi } from "../../services/api";
import "./style.css";
import { useNavigate } from "react-router-dom";

const TaskCreateForm = ({ onAdd }) => {
  const [title, setTitle] = useState("");
  const [employee, setEmployee] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [employeesList, setEmployeesList] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await employeeApi.getAllEmployee();
      if (res.data?.data) setEmployeesList(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch employees.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !employee || !dueDate) {
      setError("Title, Due Date, and Employee are required.");
      return;
    }

    try {
      const formData = new FormData();

      const taskPayload = {
        title,
        description,
        assignedToEmployeeId: employee,
        priority,
        dueDate,
      };

      formData.append(
        "task",
        new Blob([JSON.stringify(taskPayload)], {
          type: "application/json",
        })
      );

      if (files && files.length > 0) {
        Array.from(files).forEach((file) => {
          formData.append("attachments", file);
        });
      }

      const response = await taskApi.create(formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const createdTask = response.data?.data;

      setTitle("");
      setDescription("");
      setEmployee("");
      setPriority("MEDIUM");
      setDueDate("");
      setFiles([]);
      setMessage("Task created successfully!");
      setError(null);
      setIsOpen(false);

      onAdd(createdTask);

      setTimeout(() => setMessage(null), 3000);

    } catch (err) {
      console.error(err);
      setError("Failed to create task.");
    }
  };


  return (
    <Card className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Card.Header as="h5">Create New Task</Card.Header>
        <Button
          variant="primary"
          style={{ marginRight: "20px", marginTop: "10px" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Close Form" : "Create Task"}
        </Button>
      </div>

      <Card.Body>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Collapse in={isOpen}>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Task Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Assign To</Form.Label>
              <Form.Select value={employee} onChange={(e) => setEmployee(e.target.value)}>
                <option value="">-- Select Employee --</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Optional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={dueDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attachments (Images, PDF, Docs)</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => setFiles(e.target.files)}
              />
              <Form.Text muted>You can upload multiple files.</Form.Text>

              {files.length > 0 && (
                <ul className="mt-2">
                  {Array.from(files).map((file, idx) => (
                    <li key={idx}>📎 {file.name}</li>
                  ))}
                </ul>
              )}
            </Form.Group>

            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </Form>
        </Collapse>
      </Card.Body>
    </Card>
  );
};


const Tasks = () => {
  const { user } = useAuth();
  const role = user.role;

  const [tasks, setTasks] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [empNameFilter, setEmpNameFilter] = useState("");
  const [empCodeFilter, setEmpCodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);


  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      let res;
      if (role === "ROLE_EMPLOYEE") {
        res = await taskApi.getByEmployee(user.employeeId);
      } else {
        res = await taskApi.getAll();
      }
      if (res.data?.data) setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = (task) => {
    setTasks([task, ...tasks]);
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await taskApi.updateStatus(taskId, { status });
      const updated = tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
      setTasks(updated);
      setMessage(`Task marked as ${status}!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {

    const matchesDate =
      (!fromDate || new Date(t.startDate) >= new Date(fromDate)) &&
      (!toDate || new Date(t.dueDate) <= new Date(toDate));

    const matchesTitle =
      !titleFilter ||
      t.title?.toLowerCase().includes(titleFilter.toLowerCase());

    const matchesEmpName =
      !empNameFilter ||
      t.assignedToEmployeeName
        ?.toLowerCase()
        .includes(empNameFilter.toLowerCase());

    const matchesEmpCode =
      !empCodeFilter ||
      t.employeeCode
        ?.toLowerCase()
        .includes(empCodeFilter.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || t.status === statusFilter;

    return (
      matchesDate &&
      matchesTitle &&
      matchesEmpName &&
      matchesEmpCode &&
      matchesStatus
    );
  });


  const visibleTasks = role === "ROLE_EMPLOYEE"
    ? filteredTasks.filter((t) => t.assignedToEmployeeId === user.employeeId)
    : filteredTasks;

  const exportData = visibleTasks.map((t) => ({
    Employee: t.assignedToEmployeeName || "--",
    Code: t.employeeCode || "--",
    Title: t.title,
    Status: t.status,
    Priority: t.priority,
    Start: t.startDate,
    Due: t.dueDate,
  }));

  const exportToPDF = () => {
    if (exportData.length === 0) return;

    const doc = new jsPDF("landscape");
    doc.setFontSize(14);
    doc.text("Task Report", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [Object.keys(exportData[0])],
      body: exportData.map(Object.values),

      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },

      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 70 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 },
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
      },

      bodyStyles: {
        halign: "left",
      },

      theme: "grid",
    });

    doc.save("tasks-report.pdf");
  };


  const exportToExcel = () => {
    if (exportData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, "tasks-report.xlsx");
  };


  const openTaskModal = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const closeTaskModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };


  return (
    <div className="task-management">
      <div className="d-flex justify-content-between  mb-4">
        <h2>{role === "ROLE_EMPLOYEE" ? "My Tasks" : "Task Management"}</h2>
      </div>

      {(role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") && (
        <TaskCreateForm onAdd={handleAddTask} />
      )}

      {message && <Alert variant="success">{message}</Alert>}

      <div className="d-none d-md-flex align-items-end justify-content-end flex-wrap gap-3 mb-4 mt-2 p-3 desktop-filter-section">

        <Form.Group>
          <Form.Label className="task-label">From Date</Form.Label>
          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label className="task-label">To Date</Form.Label>
          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label className="task-label">Task Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="Search title"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
          />
        </Form.Group>

        {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") && (
          <>
            <Form.Group>
              <Form.Label className="task-label">Employee Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search employee"
                value={empNameFilter}
                onChange={(e) => setEmpNameFilter(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="task-label">Employee Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search code"
                value={empCodeFilter}
                onChange={(e) => setEmpCodeFilter(e.target.value)}
              />
            </Form.Group>
          </>
        )}

        <Form.Group>
          <Form.Label className="task-label">Status</Form.Label>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </Form.Select>
        </Form.Group>

      </div>

      {/* MOBILE COLLAPSIBLE FILTER */}
      <div className="d-md-none mb-3 mobile-filter-section">
        <Button
          variant="outline-light"
          className="w-100 mb-2"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
        >
          {mobileFilterOpen ? "Hide Filters ▲" : "Show Filters ▼"}
        </Button>

        <Collapse in={mobileFilterOpen}>
          <div className="mobile-filter-card p-3">

            {/* COPY SAME FILTER FORM GROUPS HERE */}

            <Form.Group className="mb-3 mobile-filter">
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3 mobile-filter">
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3 mobile-filter">
              <Form.Label>Task Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search title"
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
              />
            </Form.Group>

            {(role === "ROLE_ADMIN" ||
              role === "ROLE_MANAGER" ||
              role === "ROLE_HR" ||
              role === "ROLE_TEAM_LEADER") && (
                <>
                  <Form.Group className="mb-3 mobile-filter">
                    <Form.Label>Employee Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search employee"
                      value={empNameFilter}
                      onChange={(e) => setEmpNameFilter(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3 mobile-filter">
                    <Form.Label>Employee Code</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search code"
                      value={empCodeFilter}
                      onChange={(e) => setEmpCodeFilter(e.target.value)}
                    />
                  </Form.Group>
                </>
              )}

            <Form.Group className="mb-3 mobile-filter">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </Form.Select>
            </Form.Group>

          </div>
        </Collapse>
      </div>


      <Card className="mt-4">
        <div className="d-flex justify-content-between align-items-center p-3 ">
          <Card.Header as="h5" className="mb-0 border-0 p-0">
            {role === "ROLE_EMPLOYEE" ? "Assigned Tasks" : "All Tasks"}
          </Card.Header>

          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={exportToPDF}>
              Export PDF
            </Button>
            <Button variant="outline-success" size="sm" onClick={exportToExcel}>
              Export Excel
            </Button>
          </div>
        </div>

        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER" ) && <th>Employee</th>}
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Start</th>
                  <th>Due</th>
                  <th>Actions</th>
                  <th>Attachments</th>

                </tr>
              </thead>
              <tbody>
                {visibleTasks.length > 0 ? visibleTasks.map((t) => (
                  <tr key={t.id} onClick={() => openTaskModal(t)}>
                    {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") && (
                      <td>
                        <strong>{t.assignedToEmployeeName}</strong><br />
                        <small>ID: {t.employeeCode}</small>
                      </td>
                    )}
                    <td>{t.title}</td>
                    <td>
                      <Badge
                        bg={t.status === "COMPLETED" ? "success" :
                          t.status === "IN_PROGRESS" ? "primary" : "warning"}
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td>{t.priority}</td>
                    <td>{t.startDate}</td>
                    <td>{t.dueDate}</td>
                    <td>
                      {role === "ROLE_EMPLOYEE" && t.assignedToEmployeeId === user.employeeId && t.status !== "COMPLETED" && (
                        <Button size="sm" variant="success" onClick={() => handleStatusChange(t.id, "COMPLETED")}>
                          Mark Complete
                        </Button>
                      )}
                      {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") && t.status !== "COMPLETED" && (
                        <Button size="sm" variant="success" onClick={() => handleStatusChange(t.id, "COMPLETED")}>
                          Complete
                        </Button>
                      )}
                    </td>
                    <td>
                      {t.attachments && t.attachments.length > 0 ? (
                        t.attachments.map((file) => (
                          <div key={file.id}>
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📎 {file.fileName}
                            </a>
                          </div>
                        ))
                      ) : (
                        <span>No Files</span>
                      )}
                    </td>

                  </tr>
                )) : (
                  <tr>
                    <td colSpan={(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") ? 7 : 6} className="text-center">
                      No tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>


          <div className="task-mobile-list">
            {visibleTasks.length > 0 ? (
              visibleTasks.map((t) => (
                <div
                  className="task-card"
                  key={t.id}
                  onClick={() => openTaskModal(t)}
                >
                  {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") && (
                    <div className="field">
                      <div className="label">Employee</div>
                      <div className="value">
                        {t.assignedToEmployeeName} ({t.employeeCode})
                      </div>
                    </div>
                  )}

                  <div className="field">
                    <div className="label">Title</div>
                    <div className="value">{t.title}</div>
                  </div>

                  <div className="field">
                    <div className="label">Status</div>
                    <span
                      className={`badge bg-${t.status === "COMPLETED"
                        ? "success"
                        : t.status === "IN_PROGRESS"
                          ? "primary"
                          : "warning"
                        }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="field">
                    <div className="label">Priority</div>
                    <div className="value">{t.priority}</div>
                  </div>

                  <div className="field">
                    <div className="label">Start</div>
                    <div className="value">{t.startDate}</div>
                  </div>

                  <div className="field">
                    <div className="label">Due</div>
                    <div className="value">{t.dueDate}</div>
                  </div>

                  <div className="field">
                    {(role === "ROLE_EMPLOYEE" &&
                      t.assignedToEmployeeId === user.employeeId &&
                      t.status !== "COMPLETED") ||
                      ((role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") &&
                        t.status !== "COMPLETED") ? (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(t.id, "COMPLETED");
                        }}
                      >
                        Mark Complete
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center mt-3">No tasks found</div>
            )}
          </div>


        </Card.Body>
        {selectedTask && (
          <Modal show={showModal} onHide={closeTaskModal} centered size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Task Details</Modal.Title>
            </Modal.Header>

            <Modal.Body>

              {(role === "ROLE_ADMIN" ||
                role === "ROLE_MANAGER" ||
                role === "ROLE_TEAM_LEADER" ||
                role === "ROLE_HR") && (
                  <div className="mb-4">
                    <h5 className="mb-1">{selectedTask.assignedToEmployeeName}</h5>
                    <div className="text-muted">
                      Employee ID: {selectedTask.employeeCode}
                    </div>
                  </div>
                )}

              <div className="mb-3">
                <strong>Title</strong>
                <div className="border rounded p-3 bg-light mt-1">
                  {selectedTask.title}
                </div>
              </div>

              <div className="mb-3">
                <strong>Description</strong>
                <div
                  className="border rounded p-3 bg-light mt-1"
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.6",
                    minHeight: "80px"
                  }}
                >
                  {selectedTask.description || "No description provided."}
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <strong>Status</strong>
                  <div className="mt-1">
                    <Badge
                      bg={
                        selectedTask.status === "COMPLETED"
                          ? "success"
                          : selectedTask.status === "IN_PROGRESS"
                            ? "primary"
                            : "warning"
                      }
                    >
                      {selectedTask.status}
                    </Badge>
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <strong>Priority</strong>
                  <div className="mt-1">{selectedTask.priority}</div>
                </div>

                <div className="col-md-6 mb-3">
                  <strong>Start Date</strong>
                  <div className="mt-1">{selectedTask.startDate}</div>
                </div>

                <div className="col-md-6 mb-3">
                  <strong>Due Date</strong>
                  <div className="mt-1">{selectedTask.dueDate}</div>
                </div>
              </div>

              {selectedTask.attachments &&
                selectedTask.attachments.length > 0 && (
                  <div className="mb-3">
                    <strong>Attachments</strong>
                    <ul className="mt-2">
                      {selectedTask.attachments.map((file) => (
                        <li key={file.id}>
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📎 {file.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={closeTaskModal}>
                Close
              </Button>

              <Button
                variant="primary"
                onClick={() =>
                  navigate(`/employee/${selectedTask.assignedToEmployeeId}/tasks`)
                }
              >
                View Employee Tasks
              </Button>
            </Modal.Footer>
          </Modal>
        )}
      </Card>
    </div>
  );
};

export default Tasks;

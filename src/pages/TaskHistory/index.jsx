import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { Card, Badge, Form, Modal, Button } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { taskApi } from "../../services/api";
import EmployeeProfileInfo from "../../contexts/layout/EmployeeProfileInfo";
import './style.css'


const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "--");

const statusVariant = (status) => {
  switch (status) {
    case "COMPLETED": return "success";
    case "IN_PROGRESS": return "primary";
    default: return "warning";
  }
};

const priorityVariant = (priority) => {
  switch (priority) {
    case "HIGH": return "danger";
    case "MEDIUM": return "warning";
    default: return "secondary";
  }
};

const TaskHistory = ({ employeeId }) => {
  const { id } = useParams();
  const empId = id || employeeId;

  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  const [titleFilter, setTitleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const closeTaskModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await taskApi.getByEmployee(empId);
        const data = res.data?.data || [];
        setTasks(data);

        if (data.length) {
          const t = data[0];
          setEmployeeInfo({
            name: t.assignedToEmployeeName,
            code: t.employeeCode,
            department: t.departmentName || "--",
          });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load task history");
      }
    };
    if (empId) fetchTasks();
  }, [empId]);

  const filteredTasks = tasks.filter((t) => {
    const matchesTitle = t.title?.toLowerCase().includes(titleFilter.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

    const taskStart = new Date(t.startDate);
    const taskDue = new Date(t.dueDate);
    const matchesFromDate = fromDate ? taskDue >= new Date(fromDate) : true;
    const matchesToDate = toDate ? taskStart <= new Date(toDate) : true;

    return matchesTitle && matchesStatus && matchesFromDate && matchesToDate;
  });

  // PDF Export
  const exportToPDF = () => {
    if (!filteredTasks.length) return;

    const doc = new jsPDF("landscape"); // 👈 VERY IMPORTANT

    doc.setFontSize(14);
    doc.text("Employee Task History", 14, 15);

    let startY = 25;

    // Employee Info Section
    if (employeeInfo) {
      doc.setFontSize(10);
      doc.text(`Employee Name: ${employeeInfo.name}`, 14, startY);
      doc.text(`Employee Code: ${employeeInfo.code}`, 14, startY + 6);
      doc.text(`Department: ${employeeInfo.department}`, 14, startY + 12);
      startY += 20;
    }

    autoTable(doc, {
      startY: startY,

      head: [["Title", "Status", "Priority", "Start Date", "Due Date", "Attachments"]],

      body: filteredTasks.map((t) => [
        t.title,
        t.status,
        t.priority,
        formatDate(t.startDate),
        formatDate(t.dueDate),
        t.attachments?.map((f) => f.fileName).join(", ") || "--",
      ]),

      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },

      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 60 },
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
      },

      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },

      theme: "grid",
    });

    doc.save("employee-task-history.pdf");
  };


  // Excel Export
  const exportToExcel = () => {
    const taskRows = filteredTasks.map((t) => ({
      Title: t.title,
      Status: t.status,
      Priority: t.priority,
      "Start Date": formatDate(t.startDate),
      "Due Date": formatDate(t.dueDate),
      Attachments: t.attachments?.map((f) => f.fileName).join(", ") || "--",
    }));

    const worksheet = XLSX.utils.json_to_sheet([]);

    if (employeeInfo) {
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [
          ["Employee Name", employeeInfo.name],
          ["Employee Code", employeeInfo.code],
          ["Department", employeeInfo.department],
          [],
        ],
        { origin: "A1" }
      );
    }

    XLSX.utils.sheet_add_json(worksheet, taskRows, { origin: employeeInfo ? "A5" : "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Task History");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "employee-task-history.xlsx");
  };

  return (
    <div>
      {error && <p className="text-danger">{error}</p>}

      <EmployeeProfileInfo empId={empId} />

      {/* Filters */}
      <Card className="mt-3 mb-3 task-mobile-history-filters">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Filters</span>

          {/* Toggle Button Only On Mobile */}
          <Button
            variant="outline-primary"
            size="sm"
            className="d-md-none"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            {showMobileFilters ? "Hide" : "Show"}
          </Button>
        </Card.Header>

        {/* Desktop → Always Visible */}
        <Card.Body className="d-none d-md-block">
          <div className="d-flex flex-wrap gap-3 align-items-end">
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search title"
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
              />
            </Form.Group>


            <Form.Group>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </Form.Group>

             <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </Form.Select>
            </Form.Group>

            <Button variant="outline-danger" onClick={exportToPDF}>
              Export PDF
            </Button>
            <Button variant="outline-success" onClick={exportToExcel}>
              Export Excel
            </Button>
          </div>
        </Card.Body>

        {/* Mobile → Collapsible */}
        {showMobileFilters && (
          <Card.Body className="d-md-none">
            <div className="d-flex flex-column gap-3">
              <Form.Group>
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search title"
                  value={titleFilter}
                  onChange={(e) => {
                    setTitleFilter(e.target.value)
                  }
                  }
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    if (window.innerWidth < 768) setShowMobileFilters(false);
                  }
                  }
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label>From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value)
                  }
                  }
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value)
                    if (window.innerWidth < 768) setShowMobileFilters(false);
                  }
                  }
                />
              </Form.Group>

              <Button variant="outline-danger" onClick={exportToPDF}>
                Export PDF
              </Button>
              <Button variant="outline-success" onClick={exportToExcel}>
                Export Excel
              </Button>
            </div>
          </Card.Body>
        )}
      </Card>

      {/* Task List */}
      <Card className="mt-3">
        <Card.Header>Task History</Card.Header>
        <Card.Body>
          {/* Desktop */}
          <div className="table-responsive d-none d-md-block">
            {filteredTasks.length ? (
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Start</th>
                    <th>Due</th>
                    <th>Attachments</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} style={{ cursor: "pointer" }} onClick={() => openTaskModal(task)}>
                      <td>
                        <strong>{task.title}</strong>
                        <br />
                        <small className="text-muted">{task.description || "--"}</small>
                      </td>
                      <td><Badge bg={statusVariant(task.status)}>{task.status}</Badge></td>
                      <td><Badge bg={priorityVariant(task.priority)}>{task.priority}</Badge></td>
                      <td>{formatDate(task.startDate)}</td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>
                        {task.attachments?.length ? (
                          task.attachments.map((file) => (
                            <div key={file.id}>
                              <a href={file.downloadUrl || file.fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                📎 {file.fileName}
                              </a>
                            </div>
                          ))
                        ) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (<p className="text-muted">No tasks found</p>)}
          </div>

          {/* Mobile */}
          <div className="d-block d-md-none">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="mb-3 shadow-sm" style={{ cursor: "pointer" }} onClick={() => openTaskModal(task)}>
                <Card.Body>
                  <div className="mb-2"><strong>Title:</strong> {task.title}</div>
                  <div className="mb-2"><strong>Status:</strong> <Badge bg={statusVariant(task.status)}>{task.status}</Badge></div>
                  <div className="mb-2"><strong>Priority:</strong> <Badge bg={priorityVariant(task.priority)}>{task.priority}</Badge></div>
                  <div className="mb-2"><strong>Due:</strong> {formatDate(task.dueDate)}</div>
                  {task.attachments?.length > 0 && (
                    <div className="mb-2">
                      <strong>Attachments:</strong>
                      <ul className="list-unstyled mb-0">
                        {task.attachments.map((file) => (
                          <li key={file.id}>
                            <a href={file.downloadUrl || file.fileUrl} target="_blank" rel="noopener noreferrer">{file.fileName}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Task Modal */}
      {selectedTask && (
        <Modal show={showModal} onHide={closeTaskModal} centered size="lg">
          <Modal.Header closeButton><Modal.Title>Task Details</Modal.Title></Modal.Header>
          <Modal.Body>
            <div className="mb-3"><strong>Title:</strong> {selectedTask.title}</div>
            <div className="mb-3">
              <strong>Description:</strong>
              <div className="border rounded p-2 bg-light">{selectedTask.description || "No description"}</div>
            </div>
            <div className="mb-3"><strong>Status:</strong> <Badge bg={statusVariant(selectedTask.status)}>{selectedTask.status}</Badge></div>
            <div className="mb-3"><strong>Priority:</strong> <Badge bg={priorityVariant(selectedTask.priority)}>{selectedTask.priority}</Badge></div>
            <div className="d-flex gap-4 mb-3">
              <div><strong>Start Date</strong><div>{formatDate(selectedTask.startDate)}</div></div>
              <div><strong>Due Date</strong><div>{formatDate(selectedTask.dueDate)}</div></div>
            </div>
            {selectedTask.attachments?.length > 0 && (
              <div className="mb-3">
                <strong>Attachments:</strong>
                <ul>
                  {selectedTask.attachments.map((file) => (
                    <li key={file.id}>
                      <a href={file.downloadUrl || file.fileUrl} target="_blank" rel="noopener noreferrer">{file.fileName}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeTaskModal}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default TaskHistory;

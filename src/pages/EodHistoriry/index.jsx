import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { Card, Badge, Form, Modal, Button } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { eodApi } from "../../services/api";
import EmployeeProfileInfo from "../../contexts/layout/EmployeeProfileInfo";
import './syle.css';

const statusVariant = (status) => {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "primary";
  }
};

const EODHistory = ({ employeeId }) => {
  const { id } = useParams();
  const empCode = id || employeeId;

  const [eods, setEODs] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    status: "ALL",
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedEOD, setSelectedEOD] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const openEODModal = (eod) => {
    setSelectedEOD(eod);
    setShowModal(true);
  };

  const closeEODModal = () => {
    setShowModal(false);
    setSelectedEOD(null);
  };

  // Fetch EODs
  useEffect(() => {
    const fetchEODs = async () => {
      try {
        const res = await eodApi.getByEmployee(empCode);
        setEODs(res.data?.data || []);

        if (res.data?.data?.length) {
          const emp = res.data.data[0];
          setEmployeeInfo({
            name: emp.employeeName || "--",
            code: emp.employeeCode || empCode,
            department: emp.departmentName || "--",
          });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load EOD history");
      }
    };

    if (empCode) fetchEODs();
  }, [empCode]);

  // Filtered EODs
  const filteredEODs = eods.filter((eod) => {
    const eodDate = new Date(eod.date);
    const from = filters.fromDate ? new Date(filters.fromDate) : null;
    const to = filters.toDate ? new Date(filters.toDate) : null;

    const matchesFrom = from ? eodDate >= from : true;
    const matchesTo = to ? eodDate <= to : true;
    const matchesStatus = filters.status === "ALL" || eod.status === filters.status;

    return matchesFrom && matchesTo && matchesStatus;
  });

  // Export PDF
  const exportToPDF = () => {
    if (!filteredEODs.length) return;

    const doc = new jsPDF("landscape"); // 👈 important (more width)

    doc.setFontSize(14);
    doc.text("EOD History Report", 14, 15);

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

      head: [["Date", "Work Summary", "Blockers", "Status"]],

      body: filteredEODs.map((eod) => [
        eod.date,
        eod.workSummary,
        eod.blockers || "--",
        eod.status,
      ]),

      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },

      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 120 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
      },

      theme: "grid",
    });

    doc.save("eod-history.pdf");
  };


  // Export Excel
  const exportToExcel = () => {
    const eodRows = filteredEODs.map((eod) => ({
      Date: eod.date,
      "Work Summary": eod.workSummary,
      Blockers: eod.blockers || "--",
      Status: eod.status,
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

    XLSX.utils.sheet_add_json(worksheet, eodRows, { origin: employeeInfo ? "A5" : "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EOD History");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "eod-history.xlsx");
  };

  if (!empCode) return <div className="text-center mt-4">Loading...</div>;

  return (
    <div>
      {error && <p className="text-danger">{error}</p>}

      <EmployeeProfileInfo empId={empCode} />

      {/* Filters */}
      <Card className="mt-3 mb-3 eod-filter-section">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Filters</span>

          {/* Mobile Toggle Button */}
          <Button
            variant="outline-primary"
            size="sm"
            className="d-md-none"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            {showMobileFilters ? "Hide" : "Show"}
          </Button>
        </Card.Header>

        {/* Desktop – Always Visible */}
        <Card.Body className="d-none d-md-block">
          <div className="d-flex flex-wrap gap-3 align-items-end">
            <Form.Group>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUBMITTED">Submitted</option>
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

        {/* Mobile – Collapsible */}
        {showMobileFilters && (
          <Card.Body className="d-md-none">
            <div className="d-flex flex-column gap-3">
              <Form.Group>
                <Form.Label>From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    setFilters({ ...filters, fromDate: e.target.value })
                  }
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => {
                    setFilters({ ...filters, toDate: e.target.value })
                    if (window.innerWidth < 768) setShowMobileFilters(false);
                  } 
                  }
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value })
                    if (window.innerWidth < 768) setShowMobileFilters(false);
                  }
                  }
                >
                  <option value="ALL">All Status</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SUBMITTED">Submitted</option>
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
        )}
      </Card>

      <Card className="mt-3">
        <Card.Header>EOD History</Card.Header>
        <Card.Body>
          {/* Desktop */}
          <div className="table-responsive d-none d-md-block">
            {filteredEODs.length ? (
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Work Summary</th>
                    <th>Blockers</th>
                    <th>Status</th>
                    <th>Attachments</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEODs.map((eod) => (
                    <tr
                      key={eod.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openEODModal(eod)}
                    >
                      <td>{eod.date}</td>
                      <td>{eod.workSummary}</td>
                      <td>{eod.blockers || "--"}</td>
                      <td>
                        <Badge bg={statusVariant(eod.status)}>{eod.status}</Badge>
                      </td>
                      <td>
                        {eod.attachments?.length > 0
                          ? eod.attachments.map(f => (
                            <a key={f.id} href={f.downloadUrl} target="_blank" rel="noopener noreferrer">
                              {f.fileName}
                            </a>
                          ))
                          : "--"}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No EOD records found</p>
            )}
          </div>

          {/* Mobile */}
          <div className="d-block d-md-none">
            {filteredEODs.length === 0 && (
              <p className="text-center text-muted">No EOD records found</p>
            )}

            {filteredEODs.map((eod) => (
              <Card
                key={eod.id}
                className="mb-3 shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => openEODModal(eod)}
              >
                <Card.Body>
                  <div className="mb-2">
                    <strong>Date:</strong> {eod.date}
                  </div>

                  <div className="mb-2">
                    <strong>Work Summary:</strong>
                    <div>{eod.workSummary}</div>
                  </div>

                  <div className="mb-2">
                    <strong>Blockers:</strong> {eod.blockers || "--"}
                  </div>

                  <div className="mb-2">
                    <strong>Status:</strong>{" "}
                    <Badge bg={statusVariant(eod.status)}>{eod.status}</Badge>
                  </div>

                  {eod.attachments && eod.attachments.length > 0 && (
                    <div className="mb-2">
                      <strong>Attachments:</strong>
                      <ul className="list-unstyled mt-1 mb-0">
                        {eod.attachments.map((f) => (
                          <li key={f.id}>
                            <a href={f.downloadUrl} target="_blank" rel="noopener noreferrer">
                              {f.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </Card.Body>
              </Card>
            ))}
          </div>

          {/* EOD Modal */}
          {selectedEOD && (
            <Modal show={showModal} onHide={closeEODModal} centered size="lg">
              <Modal.Header closeButton>
                <Modal.Title>EOD Details</Modal.Title>
              </Modal.Header>

              <Modal.Body>
                <div className="mb-3">
                  <strong>Date</strong>
                  <div>{selectedEOD.date}</div>
                </div>

                <div className="mb-3">
                  <strong>Work Summary</strong>
                  <div className="border rounded p-2 bg-light">{selectedEOD.workSummary}</div>
                </div>

                <div className="mb-3">
                  <strong>Blockers</strong>
                  <div className="border rounded p-2 bg-light">{selectedEOD.blockers || "No blockers reported"}</div>
                </div>

                <div className="mb-3">
                  <strong>Status:</strong>{" "}
                  <Badge bg={statusVariant(selectedEOD.status)}>{selectedEOD.status}</Badge>
                </div>

                {selectedEOD.attachments && selectedEOD.attachments.length > 0 && (
                  <div className="mb-3">
                    <strong>Attachments:</strong>
                    <ul className="list-unstyled mt-2">
                      {selectedEOD.attachments.map((file) => (
                        <li key={file.id}>
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {file.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Modal.Body>

              <Modal.Footer>
                <Button variant="secondary" onClick={closeEODModal}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EODHistory;

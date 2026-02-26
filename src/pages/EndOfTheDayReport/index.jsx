import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, Form, Table, Button, Alert, Collapse, Modal } from "react-bootstrap";
import { eodApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import "./style.css";
import { useNavigate } from "react-router-dom";

const EODForm = ({ onAdd, user }) => {
  const [workSummary, setWorkSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!workSummary) {
      setError("Work summary is required.");
      return;
    }

    try {
      const formData = new FormData();

      const eodData = {
        employeeId: user?.employeeId,
        employeeCode: user?.employee?.employeeId,
        workSummary,
        blockers,
        date: new Date().toISOString().split("T")[0],
        status: "SUBMITTED",
      };

      formData.append(
        "eod",
        new Blob([JSON.stringify(eodData)], { type: "application/json" })
      );

      if (files && files.length > 0) {
        Array.from(files).forEach((file) => {
          formData.append("attachments", file);
        });
      }

      const res = await eodApi.create(formData);

      const newEOD = res.data.data;

      setWorkSummary("");
      setBlockers("");
      setFiles([]);
      setMessage("EOD submitted successfully!");
      setError(null);
      setIsOpen(false);

      onAdd(newEOD);

      setTimeout(() => setMessage(null), 3000);

    } catch (err) {
      console.error(err);
      setError("Failed to submit EOD.");
    }
  };

  return (
    <Card className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Card.Header as="h5">Submit EOD Report</Card.Header>
        <Button
          type="button"
          variant="primary"
          style={{ marginRight: "20px", marginTop: "10px" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Close Form" : "Fill EOD Report"}
        </Button>
      </div>
      <Card.Body>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Collapse in={isOpen}>
          <Form onSubmit={handleSubmit} className="eod-form">
            <Form.Group className="mb-3">
              <Form.Label>Work Summary</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Blockers / Issues (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attachments (Optional)</Form.Label>
              <Form.Control
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                accept=".pdf, .doc, .docx, image/*"
              />
              <Form.Text muted>
                You can upload multiple files: PDFs, Word docs, and images.
              </Form.Text>

              {files.length > 0 && (
                <ul className="mt-2">
                  {Array.from(files).map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              )}
            </Form.Group>

            <Button variant="primary" type="submit">
              Submit EOD
            </Button>
          </Form>
        </Collapse>
      </Card.Body>
    </Card>
  );
};



const EndOfTheDayReport = () => {
  const [eods, setEODs] = useState([]);
  const { user } = useAuth();

  const [message, setMessage] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [empIdFilter, setEmpIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedEOD, setSelectedEOD] = useState(null);

  const getToday = () => new Date().toISOString().split("T")[0];

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const [fromDate, setFromDate] = useState(getYesterday());
  const [toDate, setToDate] = useState(getToday());




  const openEODModal = (eod) => {
    setSelectedEOD(eod);
    setShowModal(true);
  };

  const closeEODModal = () => {
    setShowModal(false);
    setSelectedEOD(null);
  };


  const navigate = useNavigate();



  const role = user?.role;


  const fetchEODs = async () => {
    try {
      let list = [];

      // Everyone's EODs (for table)
      if (role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") {
        const resAll = await eodApi.getAll();
        list = Array.isArray(resAll.data?.data) ? resAll.data.data : [];
      } else {
        const resSelf = await eodApi.getByEmployee(user?.employeeId);
        list = Array.isArray(resSelf.data?.data) ? resSelf.data.data : [];
      }

      setEODs(list);
    } catch (err) {
      console.error("EOD fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchEODs();
  }, []);

  if (!user) {
    return <div className="text-center mt-4">Loading...</div>;
  }


  const handleAddEOD = (newEOD) => {
    setEODs((prev) => [newEOD, ...prev]);
  };

  const handleStatusChange = async (eodId, status) => {
    try {
      await eodApi.updateStatus(eodId, {
        status: status,
      });

      setEODs((prev) =>
        prev.map((e) => (e.id === eodId ? { ...e, status } : e))
      );

      setMessage(`EOD marked as ${status.toLowerCase()}!`);
      setTimeout(() => setMessage(null), 3000);

    } catch (err) {
      console.error(err);
      setMessage("Failed to update EOD status.");
    }
  };



  const normalize = (v) =>
    (v || "").toString().toLowerCase().trim();

  const filteredEODs = eods.filter((e) => {

    const eodDate = new Date(e.date + "T00:00:00");
    const from = new Date(fromDate + "T00:00:00");
    const to = new Date(toDate + "T23:59:59");

    if (eodDate < from || eodDate > to) return false;


    if (statusFilter !== "ALL" && e.status !== statusFilter) {
      return false;
    }


    if (
      (role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") &&
      nameFilter
    ) {
      const name = normalize(e.employeeName);
      if (!name.includes(normalize(nameFilter))) return false;
    }


    if (
      (role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") &&
      empIdFilter
    ) {
      const empCode = normalize(e.employeeCode);
      if (!empCode.includes(normalize(empIdFilter))) return false;
    }

    return true;
  });


  const exportToExcel = () => {
    const data = filteredEODs.map((e) => ({
      Date: e.date,
      Employee: e.employeeName,
      Employee_ID: e.employeeCode,
      Work_Summary: e.workSummary,
      Blockers: e.blockers || "",
      Status: e.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EOD Reports");

    XLSX.writeFile(workbook, "EOD_Reports.xlsx");
  };

  const exportToPDF = () => {
    if (!filteredEODs.length) return;

    const doc = new jsPDF("landscape");

    doc.setFontSize(14);
    doc.text("EOD Reports", 14, 15);

    const tableData = filteredEODs.map((e) => [
      e.date,
      e.employeeName,
      e.employeeCode,
      e.workSummary,
      e.blockers || "--",
      e.status,
    ]);

    autoTable(doc, {

      startY: 25,

      head: [["Date", "Employee", "Emp ID", "Work Summary", "Blockers", "Status"]],
      body: tableData,

      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },

      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 90 },
        4: { cellWidth: 30 },
        5: { cellWidth: 40 },
      },

      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        halign: "center",
      },

      theme: "grid",
    });

    doc.save("EOD_Reports.pdf");
  };




  return (
    <div className="eod-container">
      <div className="filter-section-continer">
        <div className="eod-header mb-4">
          <h2 className="mb-3">
            {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER")
              ? "EOD Reports Management"
              : "My EOD Reports"}
          </h2>
          {/* DESKTOP FILTERS */}
          <div className="d-none d-md-flex flex-wrap gap-2 align-items-center mb-3 justify-content-end">

            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "160px" }}
            >
              <option value="ALL">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Form.Select>

            {(role === "ROLE_ADMIN" ||
              role === "ROLE_MANAGER" ||
              role === "ROLE_HR" ||
              role === "ROLE_TEAM_LEADER") && (
                <>
                  <Form.Control
                    type="text"
                    placeholder="Employee Name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    style={{ width: "180px" }}
                  />
                  <Form.Control
                    type="text"
                    placeholder="Emp ID"
                    value={empIdFilter}
                    onChange={(e) => setEmpIdFilter(e.target.value)}
                    style={{ width: "150px" }}
                  />
                </>
              )}

            <Form.Control
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: "170px" }}
            />

            <Form.Control
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: "170px" }}
            />

            <Button variant="success" onClick={exportToExcel}>
              Export Excel
            </Button>

            <Button variant="danger" onClick={exportToPDF}>
              Export PDF
            </Button>

          </div>
          {/* MOBILE FILTER */}
          <div className="d-md-none mb-3">

            <Button
              variant="outline-light"
              className="w-100 mb-2"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            >
              {mobileFilterOpen ? "Hide Filters ▲" : "Show Filters ▼"}
            </Button>

            <Collapse in={mobileFilterOpen}>
              <div className="mobile-filter-card p-3">

                <Form.Group className="mb-3 text-white">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </Form.Select>
                </Form.Group>

                {(role === "ROLE_ADMIN" ||
                  role === "ROLE_MANAGER" ||
                  role === "ROLE_HR" ||
                  role === "ROLE_TEAM_LEADER") && (
                    <>
                      <Form.Group className="mb-3 text-white">
                        <Form.Label>Employee Name</Form.Label>
                        <Form.Control
                          placeholder="Search Name"
                          type="text"
                          value={nameFilter}
                          onChange={(e) => setNameFilter(e.target.value)}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3 text-white">
                        <Form.Label>Employee ID</Form.Label>
                        <Form.Control
                          placeholder="Serach Employee code"
                          type="text"
                          value={empIdFilter}
                          onChange={(e) => setEmpIdFilter(e.target.value)}
                        />
                      </Form.Group>
                    </>
                  )}

                <Form.Group className="mb-3 text-white">
                  <Form.Label>From Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3 text-white">
                  <Form.Label>To Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </Form.Group>

                <Button variant="success" className="w-100 mb-2" onClick={exportToExcel}>
                  Export Excel
                </Button>

                <Button variant="danger" className="w-100" onClick={exportToPDF}>
                  Export PDF
                </Button>

              </div>
            </Collapse>
          </div>

        </div>
      </div>

      {/* EOD Form for employees */}
      {(role === "ROLE_EMPLOYEE" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") && (
        <EODForm onAdd={handleAddEOD} user={user} />
      )}

      {message && (
        <Alert variant="success" className="mt-3">
          {message}
        </Alert>
      )}

      <Card className="mt-4">
        <Card.Header as="h5">
          {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") ? "All EOD Reports" : "My EOD Reports"}
        </Card.Header>

        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") && <th>Employee</th>}
                  <th>Date</th>
                  <th>Work Summary</th>
                  <th>Blockers</th>
                  <th>Status</th>
                  <th>Attachments</th>
                  {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredEODs.length > 0 ? (
                  filteredEODs.map((e) => {
                    const isOwn = e.employeeId === user?.employeeId;
                    return (
                      <tr
                        key={e.id}
                        className={isOwn ? "table-warning" : ""}
                        onClick={() => openEODModal(e)}
                      >
                        {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") && (
                          <td>
                            <strong>{e.employeeName}</strong>
                            <br />
                            <small>ID: {e.employeeCode}</small>
                          </td>
                        )}
                        <td>{e.date}</td>
                        <td>{e.workSummary}</td>
                        <td>{e.blockers || "--"}</td>
                        <td>
                          <span
                            className={`badge bg-${e.status === "APPROVED"
                              ? "success"
                              : e.status === "REJECTED"
                                ? "danger"
                                : "primary"
                              }`}
                          >
                            {e.status}
                          </span>
                        </td>
                        <td>
                          {e.attachments && e.attachments.length > 0 ? (
                            e.attachments.map((file) => (
                              <div key={file.id}>
                                <a
                                  href={file.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  {file.fileName}
                                </a>
                              </div>
                            ))
                          ) : (
                            "--"
                          )}
                        </td>

                        {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") && e.status === "SUBMITTED" && (
                          <td>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={(ev) => { ev.stopPropagation(); handleStatusChange(e.id, "APPROVED"); }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(ev) => { ev.stopPropagation(); handleStatusChange(e.id, "REJECTED"); }}
                            >
                              Reject
                            </Button>
                          </td>
                        )}
                        {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_TEAM_LEADER") && e.status !== "SUBMITTED" && <td></td>}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center empty-row">
                      No EOD reports found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {selectedEOD && (
            <Modal show={showModal} onHide={closeEODModal} centered size="lg">
              <Modal.Header closeButton>
                <Modal.Title>EOD Details</Modal.Title>
              </Modal.Header>

              <Modal.Body>
                {(role === "ROLE_ADMIN" || role === "ROLE_MANAGER" || role === "ROLE_HR" || role === "ROLE_TEAM_LEADER") && (
                  <div className="mb-3">
                    <strong>{selectedEOD.employeeName}</strong>
                    <div className="text-muted">
                      Employee ID: {selectedEOD.employeeCode}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <strong>Date</strong>
                  <div>{selectedEOD.date}</div>
                </div>

                <div className="mb-3">
                  <strong>Work Summary</strong>
                  <div className="border rounded p-2 bg-light">
                    {selectedEOD.workSummary}
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Blockers</strong>
                  <div className="border rounded p-2 bg-light">
                    {selectedEOD.blockers || "No blockers reported"}
                  </div>
                </div>

                <div className="mb-2">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`badge bg-${selectedEOD.status === "APPROVED"
                      ? "success"
                      : selectedEOD.status === "REJECTED"
                        ? "danger"
                        : "primary"
                      }`}
                  >
                    {selectedEOD.status}
                  </span>
                </div>
                {selectedEOD.attachments && selectedEOD.attachments.length > 0 && (
                  <div className="mb-3">
                    <strong>Attachments:</strong>
                    <ul>
                      {selectedEOD.attachments.map((file) => (
                        <li key={file.id}>
                          <a href={file.downloadUrl || file.fileUrl} target="_blank" rel="noopener noreferrer">
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

                <Button
                  variant="primary"
                  onClick={() =>
                    navigate(`/employee/${selectedEOD.employeeId}/eod-report`)
                  }
                >
                  View EOD History
                </Button>
              </Modal.Footer>
            </Modal>
          )}

          {/* Mobile view */}
          <div className="eod-mobile-list">
            {filteredEODs.length > 0 ? (
              filteredEODs.map((e) => (
                <div
                  className="eod-card"
                  key={e.id}
                  onClick={() => openEODModal(e)}
                >
                  {(role === "ROLE_ADMIN" ||
                    role === "ROLE_MANAGER" ||
                    role === "ROLE_HR") && (
                      <div className="field">
                        <div className="label">Employee</div>
                        <div className="value">
                          {e.employeeName} ({e.employeeCode})
                        </div>
                      </div>
                    )}

                  <div className="field">
                    <div className="label">Date</div>
                    <div className="value">{e.date}</div>
                  </div>

                  <div className="field">
                    <div className="label">Work Summary</div>
                    <div className="value">{e.workSummary}</div>
                  </div>

                  <div className="field">
                    <div className="label">Blockers</div>
                    <div className="value">{e.blockers || "--"}</div>
                  </div>

                  <div className="field">
                    <div className="label">Status</div>
                    <span
                      className={`badge bg-${e.status === "APPROVED"
                        ? "success"
                        : e.status === "REJECTED"
                          ? "danger"
                          : "primary"
                        }`}
                    >
                      {e.status}
                    </span>
                  </div>

                  {e.attachments && e.attachments.length > 0 && (
                    <div className="field">
                      <div className="label">Attachments</div>
                      <ul className="list-unstyled mb-0">
                        {e.attachments.map((file) => (
                          <li key={file.id}>
                            <a
                              href={file.downloadUrl || file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              {file.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 empty-row">
                No EOD reports found
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>

  );

};

export default EndOfTheDayReport;

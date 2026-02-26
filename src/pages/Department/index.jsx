import { useState, useEffect } from "react";
import { Card, Table, Form, Button, Alert, Modal, Spinner } from "react-bootstrap";
import { departmentApi } from "../../services/api";
import "./style.css";
import { useNavigate } from "react-router-dom";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigate();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);


  //  Fetch all departments 
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentApi.getAll();
      setDepartments(res.data.data);
    } catch (err) {
      setError("Failed to fetch departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  //  Add new department 
  const handleAddDept = async (e) => {
    e.preventDefault();

    if (!newDept.trim()) {
      setError("Department name cannot be empty.");
      return;
    }

    try {
      const res = await departmentApi.create({ name: newDept.trim() });

      setDepartments([res.data.data, ...departments]);
      setNewDept("");
      setMessage("Department added successfully!");
      setError(null);
    } catch (err) {
      setError("Error adding department.");
    }

    setTimeout(() => setMessage(null), 3000);
  };

  //  Delete department 
  const handleDeleteDept = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;

    try {
      await departmentApi.delete(id);
      setDepartments(departments.filter((d) => d.id !== id));
      setMessage("Department deleted successfully!");
    } catch (err) {
      setError("Failed to delete department.");
    }

    setTimeout(() => setMessage(null), 3000);
  };

  //  Edit modal open 
  const handleEditDept = (dept) => {
    setEditingDept(dept);
    setShowEditModal(true);
  };

  //  Save edited department 
  const handleSaveEdit = async () => {
    if (!editingDept.name.trim()) {
      setError("Department name cannot be empty.");
      return;
    }

    try {
      const res = await departmentApi.update(editingDept.id, { name: editingDept.name.trim() });

      const updatedDept = res.data.data;

      setDepartments(
        departments.map((d) => (d.id === updatedDept.id ? updatedDept : d))
      );

      setShowEditModal(false);
      setMessage("Department updated successfully!");
      setError(null);
    } catch (err) {
      setError("Failed to update department.");
    }

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div>
      <h2 className="mb-4">Departments</h2>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}


      <Card className="mb-4">
        <Card.Header as="h5">Add Department</Card.Header>
        <Card.Body>
          <Form onSubmit={handleAddDept} className="d-flex gap-2 flex-wrap">
            <Form.Control
              type="text"
              placeholder="Enter department name"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
            />
            <Button type="submit" variant="primary">
              Add
            </Button>
          </Form>
        </Card.Body>
      </Card>


      <Card>
        <Card.Header as="h5">Department List</Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Department Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length > 0 ? (
                      departments.map((dept, index) => (
                        <tr key={dept.id} onClick={() => navigation(`/department/${dept.id}/employees`)}>
                          <td>{index + 1}</td>
                          <td>{dept.name}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="info"
                              className="me-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditDept(dept)
                              }
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDept(dept.id)
                              }
                              }
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center">
                          No departments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="department-mobile-list">
                {departments.length > 0 ? (
                  departments.map((dept, index) => (
                    <div className="department-card" key={dept.id} onClick={() => navigation(`/department/${dept.id}/employees`)}>
                      <div className="dept-field">
                        <span className="label">Department</span>
                        <span className="value">{dept.name}</span>
                      </div>

                      <div className="dept-actions">
                        <Button
                          size="sm"
                          variant="info"
                          className="w-100 mb-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditDept(dept)
                          }
                          }
                        >
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          className="w-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDept(dept.id)}
                            }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center mt-3">No departments found</p>
                )}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Department</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Department Name</Form.Label>
            <Form.Control
              type="text"
              value={editingDept?.name || ""}
              onChange={(e) =>
                setEditingDept({ ...editingDept, name: e.target.value })
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Department;

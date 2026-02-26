import { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { holidayApi } from "../../services/api";

const AddHolidayModal = ({ show, handleClose, onHolidayAdded }) => {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!date || !name.trim()) {
      setError("Please enter both title and date");
      return;
    }

    try {
      const response = await holidayApi.addHoliday({
        date,
        name: name.trim(),
      });

      const createdHoliday = response.data?.data || response.data;

      setSuccess("Holiday added successfully!");
      setDate("");
      setName("");

      if (createdHoliday) {
        onHolidayAdded(createdHoliday);
      }

      setTimeout(() => handleClose(), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add holiday");
    }
  };


  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Add Holiday</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleAddHoliday}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter holiday title"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Select Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Add Holiday
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddHolidayModal;

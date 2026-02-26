import { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";

const AnnouncementForm = ({ show, onClose, onSave }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!title || !message) {
      setError("Title and message are required");
      return;
    }

    onSave({
      title,
      message,
      priority,
      createdAt: new Date().toISOString(),
    });

    setTitle("");
    setMessage("");
    setPriority("NORMAL");
    setError("");
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Announcement</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Priority</Form.Label>
          <Form.Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </Form.Select>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Publish
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AnnouncementForm;

import { useState } from "react";
import { Card, Button, Form, Row, Col } from "react-bootstrap";

const LocationForm = ({ onSave }) => {
  const [form, setForm] = useState({
    locationName: "",
    latitude: "",
    longitude: "",
    radiusInMeters: 100,
    locationType: "OFFICE"
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = () => {
    onSave({
      ...form,
      latitude: form.locationType === "WFH" ? null : Number(form.latitude),
      longitude: form.locationType === "WFH" ? null : Number(form.longitude),
      radiusInMeters: Number(form.radiusInMeters)
    });
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <h5>Add Allowed Location</h5>

        <Row>
          <Col md={6}>
            <Form.Control
              name="locationName"
              placeholder="Location Name"
              onChange={handleChange}
            />
          </Col>

          <Col md={6}>
            <Form.Select name="locationType" onChange={handleChange}>
              <option value="OFFICE">Office</option>
              <option value="WFH">Work From Home</option>
            </Form.Select>
          </Col>
        </Row>

        {form.locationType === "OFFICE" && (
          <Row className="mt-2">
            <Col md={4}>
              <Form.Control
                name="latitude"
                placeholder="Latitude"
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Control
                name="longitude"
                placeholder="Longitude"
                onChange={handleChange}
              />
            </Col>
            <Col md={4}>
              <Form.Control
                name="radiusInMeters"
                placeholder="Radius (meters)"
                value={form.radiusInMeters}
                onChange={handleChange}
              />
            </Col>
          </Row>
        )}

        <Button className="mt-3" onClick={submit}>
          Save Location
        </Button>
      </Card.Body>
    </Card>
  );
};

export default LocationForm;

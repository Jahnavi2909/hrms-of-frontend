import { Card, Button, Table, Badge } from "react-bootstrap";

const LocationList = ({ locations, onDelete }) => {
  return (
    <Card>
      <Card.Body>
        <h5>Allowed Locations</h5>

        <Table responsive>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Radius</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr key={loc.id}>
                <td>{loc.locationName}</td>
                <td>
                  <Badge bg={loc.locationType === "OFFICE" ? "primary" : "success"}>
                    {loc.locationType}
                  </Badge>
                </td>
                <td>{loc.latitude ?? "-"}</td>
                <td>{loc.longitude ?? "-"}</td>
                <td>{loc.radiusInMeters} m</td>
                <td>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onDelete(loc.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default LocationList;

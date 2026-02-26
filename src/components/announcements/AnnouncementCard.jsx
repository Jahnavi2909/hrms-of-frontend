import { Card, Badge } from "react-bootstrap";

const priorityVariant = (priority) => {
  switch (priority) {
    case "URGENT":
      return "danger";
    case "IMPORTANT":
      return "warning";
    default:
      return "primary";
  }
};

const AnnouncementCard = ({ announcement }) => {
  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center">
          <Card.Title>{announcement.title}</Card.Title>
          <Badge bg={priorityVariant(announcement.priority)}>
            {announcement.priority}
          </Badge>
        </div>

        <Card.Text className="mt-2">
          {announcement.message}
        </Card.Text>

        <small className="text-muted">
          {new Date(announcement.createdAt).toLocaleString()}
        </small>
      </Card.Body>
    </Card>
  );
};

export default AnnouncementCard;

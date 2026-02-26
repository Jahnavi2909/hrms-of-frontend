import { useState } from "react";
import { Card, Table, Button, Badge, Alert, Placeholder } from "react-bootstrap";
import { FaCircle, FaTrash } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import "./style.css";
import { useNavigate } from "react-router-dom";



const getNotificationRoute = (notification) => {
  switch (notification.type) {
    case "TASK":
      return `/tasks`;

    case "LEAVE":
      return `/leaves`;

    case "ATTENDANCE":
      return `/attendance`;

    case "EOD":
      return `/eod`;

    case "ANNOUNCEMENT":
      return `/announcements`;

    default:
      return null;
  }
};


const Notifications = () => {
  const { user, notifications, markAsRead, deleteNotification } = useAuth();

  const [filterType, setFilterType] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();


  const filteredNotifications = notifications.filter((n) => {
    if (filterType !== "ALL" && n.type !== filterType) return false;
    if (filterDate && n.date !== filterDate) return false;
    return true;
  });

  const SkeletonRow = () => (
    <tr>
      <td colSpan="7">
        <Placeholder as="div" animation="glow">
          <Placeholder xs={12} />
        </Placeholder>
      </td>
    </tr>
  );

  return (
    <div>
      <h2 className="mb-4">Notifications</h2>
      {msg && <Alert variant="danger">{msg}</Alert>}

      <Card>
        <Card.Header as="h5">Notifications</Card.Header>
        <Card.Body>
          {/* DESKTOP TABLE */}
          <div className="table-responsive d-none d-md-block">
            <Table hover>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Sender</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : filteredNotifications.length ? (
                  filteredNotifications.map((n) => (
                    <tr
                      key={n.id}
                      className={`notification-row ${!n.read ? "fw-bold" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (!n.read) {
                          markAsRead(n.id);
                        }

                        const route = getNotificationRoute(n);
                        if (route) navigate(route);
                      }}
                    >


                      <td>
                        <FaCircle
                          size={10}
                          className={n.read ? "text-muted" : "text-primary"}
                        />
                      </td>
                      <td>
                        <Badge bg="secondary">{n.type}</Badge>
                      </td>
                      <td>{n.title}</td>
                      <td>{n.message}</td>
                      <td>{n.senderName || "System"}</td>
                      <td>{n.date}</td>
                      <td className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant={n.read ? "secondary" : "primary"}
                          disabled={n.read}
                          style={{ cursor: n.read ? "not-allowed" : "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!n.read) {
                              markAsRead(n.id);
                            }
                          }}
                        >
                          {n.read ? "Read" : "Mark Read"}
                        </Button>


                        {(user.role === "ROLE_ADMIN" || user.role === "ROLE_HR") && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                          >
                            <FaTrash />
                          </Button>

                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">
                      No notifications
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* MOBILE */}
          <div className="d-block d-md-none">
            {loading ? (
              <Placeholder animation="glow">
                <Placeholder xs={12} />
                <Placeholder xs={10} />
              </Placeholder>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-card p-3 mb-3 border rounded ${!n.read ? "fw-bold" : ""
                    }`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (!n.read) {
                      markAsRead(n.id);
                    }

                    const route = getNotificationRoute(n);
                    if (route) navigate(route);
                  }}
                >
                  {/* Status */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Badge bg="secondary">{n.type}</Badge>
                    <FaCircle
                      size={10}
                      className={n.read ? "text-muted" : "text-primary"}
                    />
                  </div>

                  <strong>{n.title}</strong>
                  <p className="mb-1">{n.message}</p>
                  <small className="text-muted">
                    {n.senderName || "System"} • {n.date}
                  </small>

                  <div className="mt-2 d-flex gap-2">
                    <Button
                      size="sm"
                      variant={n.read ? "secondary" : "primary"}
                      disabled={n.read}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.read) {
                          markAsRead(n.id);
                        }
                      }}
                    >
                      {n.read ? "Read" : "Mark Read"}
                    </Button>

                    {(user.role === "ROLE_ADMIN" || user.role === "ROLE_HR") && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                      >
                        <FaTrash />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 empty-notification">
                No notifications
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Notifications;

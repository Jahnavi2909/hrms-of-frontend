import { useState } from "react";
import { Button, Card } from "react-bootstrap";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementList from "./AnnouncementList";
import { useAuth } from "../../contexts/AuthContext";

const Announcements = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  const canPost =
    user?.role === "ROLE_ADMIN" || user?.role === "ROLE_HR";

  const handleSave = (announcement) => {
    setAnnouncements((prev) => [
      { ...announcement, id: Date.now() },
      ...prev,
    ]);
  };

  return (
    <Card className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>📢 Announcements</h4>
        {canPost && (
          <Button onClick={() => setShowForm(true)}>
            Create
          </Button>
        )}
      </div>

      <AnnouncementList announcements={announcements} />

      <AnnouncementForm
        show={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />
    </Card>
  );
};

export default Announcements;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { userApi } from "../../services/api";
import "./style.css";
import WfhSettings from "../../components/WfhSettings";
import { useError } from "../../contexts/ErrorContext";

const Settings = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const { showError } = useError();

  const isAdminOrHr = user && (user.role === "ROLE_ADMIN" || user.role === "ROLE_HR");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState(null);
  // const [error, showError] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.username || "",
        email: user.email || "",
      });
    }
  }, [user]);

  /* ---------------- VALIDATORS ---------------- */
  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  /* ---------------- PROFILE UPDATE ---------------- */
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    showError(null);

    if (!profile.name.trim()) {
      showError("Name is required.");
      return;
    }

    if (profile.name.length < 3) {
      showError("Name must be at least 3 characters.");
      return;
    }

    if (!profile.email.trim()) {
      showError("Email is required.");
      return;
    }

    if (!isValidEmail(profile.email)) {
      showError("Please enter a valid email address.");
      return;
    }

    try {
      await userApi.updateProfile(profile);

      setMessage("Profile updated successfully!");
      setUser({
        ...user,
        username: profile.name,
        email: profile.email,
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update profile");
    }
  };

  /* ---------------- CHANGE PASSWORD ---------------- */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    showError(null);

    const { currentPassword, newPassword, confirmPassword } = passwords;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError("All password fields are required.");
      return;
    }

    if (newPassword === currentPassword) {
      showError("New password cannot be same as current password.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      showError(
        "Password must be at least 8 characters and include uppercase, lowercase, and number."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("New password and confirm password do not match.");
      return;
    }

    try {
      await userApi.changePassword(passwords);

      setMessage("Password changed successfully!");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to change password");
    }
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }


  return (
    <div>
      <h2 className="mb-4">Settings</h2>

      {/* Profile */}
      <Card className="mb-4">
        <Card.Header as="h5">Profile</Card.Header>
        <Card.Body>
          {/* {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>} */}

          <Form onSubmit={handleProfileSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Control type="text" value={user?.role || ""} disabled />
            </Form.Group>

            <Button type="submit">Update Profile</Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Change Password */}

      <Card className="mb-4">
        <Card.Header as="h5">Change Password</Card.Header>
        <Card.Body>
          <Form onSubmit={handlePasswordSubmit}>
            {/* Current Password */}
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <div className="password-input-wrapper">
                <Form.Control
                  type={passwords.showCurrent ? "text" : "password"}
                  value={passwords.currentPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, currentPassword: e.target.value })
                  }
                />
                <span
                  className="password-toggle"
                  onClick={() =>
                    setPasswords((prev) => ({
                      ...prev,
                      showCurrent: !prev.showCurrent,
                    }))
                  }
                >
                  {passwords.showCurrent ? "🙈" : "👁️"}
                </span>
              </div>
            </Form.Group>

            {/* New Password */}
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <div className="password-input-wrapper">
                <Form.Control
                  type={passwords.showNew ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                />
                <span
                  className="password-toggle"
                  onClick={() =>
                    setPasswords((prev) => ({ ...prev, showNew: !prev.showNew }))
                  }
                >
                  {passwords.showNew ? "🙈" : "👁️"}
                </span>
              </div>
            </Form.Group>

            {/* Confirm New Password */}
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <div className="password-input-wrapper">
                <Form.Control
                  type={passwords.showConfirm ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirmPassword: e.target.value })
                  }
                />
                <span
                  className="password-toggle"
                  onClick={() =>
                    setPasswords((prev) => ({ ...prev, showConfirm: !prev.showConfirm }))
                  }
                >
                  {passwords.showConfirm ? "🙈" : "👁️"}
                </span>
              </div>
            </Form.Group>

            <Button type="submit">Change Password</Button>
          </Form>
        </Card.Body>
      </Card>

      {
        isAdminOrHr && <WfhSettings />
      }


      {user?.role === "ROLE_ADMIN" && (
        <Card className="mb-4">
          <Card.Header as="h5">System Preferences</Card.Header>
          <Card.Body>
            <Button onClick={() => navigate("/locations")}>
              Manage Locations
            </Button>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default Settings;

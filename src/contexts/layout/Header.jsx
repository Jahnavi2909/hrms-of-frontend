import { Button, Container, Dropdown, Nav, Navbar } from "react-bootstrap";
import { FaBars, FaBell, FaCog, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../AuthContext";
import { Link } from "react-router-dom";
import "./style.css";

const Header = ({ collapsed, toggleSidebar }) => {
  const { user, logout, unreadCount } = useAuth();

  if (!user) return null;

  return (
    <div className={`nav-bar ${collapsed ? "collapsed" : ""}`}>
     <Navbar
  bg="white"
  variant="light"
  className="border-bottom shadow-sm sticky-top"
>

        <Container fluid className="px-4 d-flex flex-row align-items-center">
          {/* Brand */}
          <Navbar.Brand className="d-md-block">
            <Link to={"/"}>
              <img
                src="/Raynxsystemslogo.png"
                alt="Raynx Systems"
                className="logo"
              />
            </Link>
          </Navbar.Brand>

          {/* Right section */}
          <Nav className="ms-auto align-items-center gap-2">
            {/* Notifications */}
            <Link to="/notifications" className="position-relative p-2">
              <FaBell size={18} className="text-muted" />
              {unreadCount > 0 && (
                <span className="badge bell-badge rounded-pill bg-danger position-absolute top-0 translate-middle">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Profile dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="light"
                className="bg-transparent border-0 p-0"
              >
                <div className="d-flex align-items-center">
                  <div className="me-2 text-end d-none d-md-block">
                    <div className="fw-medium">
                      {user?.employee?.firstName || user?.username}
                    </div>
                    <small className="text-muted">
                      { user?.role?.replace("ROLE_", "")}
                    </small>
                  </div>
                  <div className="avatar-circle bg-primary text-white">
                    {user?.employee?.avatar ? (
                      <img
                        src={user.employee.avatar}
                        alt="Profile"
                        className="avatar-img"
                      />
                    ) : (
                      (user?.employee?.firstName?.[0] || "U").toUpperCase()
                    )}
                  </div>

                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-sm border-0">
                <Dropdown.Header>
                  <strong>{user?.employee?.firstName || user?.username}</strong>
                  <br />
                  <small className="text-muted">{user?.email}</small>
                </Dropdown.Header>

                <Dropdown.Item as={Link} to="/profile">
                  <FaUserCircle className="me-2" /> Profile
                </Dropdown.Item>

                <Dropdown.Item as={Link} to="/settings">
                  <FaCog className="me-2" /> Settings
                </Dropdown.Item>

                <Dropdown.Divider />
                <Dropdown.Item className="text-danger" onClick={logout}>
                  <FaSignOutAlt className="me-2" /> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <Button
              variant="outline-primary"
              size="sm"
              className="ms-2 sidebar-toggle-btn d-lg-none"
              onClick={toggleSidebar}
            >
              <FaBars size={16} />
            </Button>


          </Nav>
        </Container>
      </Navbar >
    </div>
  );
};

export default Header;

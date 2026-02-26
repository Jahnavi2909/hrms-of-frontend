
import { Nav } from "react-bootstrap";
import { useAuth } from "../AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
    FaHome,
    FaUsers,
    FaCalendarCheck,
    FaBuilding,
    FaFileAlt,
    FaTasks,
    FaClipboardList,
    FaBell,
    FaCog,
    FaMoneyCheckAlt,
    FaSignOutAlt,
    FaAngleRight,
    FaAngleLeft,
} from "react-icons/fa";

import './style.css';

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, toggleSidebar }) => {

    const { user, logout } = useAuth();
    const location = useLocation();

    const handleNavClick = () => {
        if (window.innerWidth <= 992) {
            toggleSidebar();
        }
    };



    const menuItems = [
        {
            to: '/',
            icon: <FaHome />,
            label: 'Dashboard',
            roles: ['admin', 'manager', 'employee', 'hr', 'team_leader'],
        },
        {
            to: '/employees',
            icon: <FaUsers />,
            label: 'Employees',
            roles: ['admin', 'manager', 'hr'],
        },
        {
            to: '/attendance',
            icon: <FaCalendarCheck />,
            label: 'Attendance',
            roles: ['admin', 'manager', 'employee', 'hr', 'team_leader'],
        },
        {
            to: '/departments',
            icon: <FaBuilding />,
            label: 'Department',
            roles: ['admin', 'manager', 'hr'],
        },
        {
            to: '/leaves',
            icon: <FaFileAlt />,
            label: 'Leaves',
            roles: ['admin', 'manager', 'employee', 'hr', 'team_leader'],
        },
        {
            to: '/tasks',
            icon: <FaTasks />,
            label: 'Tasks',
            roles: ['admin', 'manager', 'employee', 'team_leader'],
        },
        {
            to: '/eod-report',
            icon: <FaClipboardList />,
            label: 'EOD Report',
            roles: ['admin', 'manager', 'employee', 'hr', 'team_leader'],
        },
        // {
        //     to: 'http://localhost:3000/login?forceLogin=true',
        //     icon: <FaMoneyCheckAlt />,
        //     label: 'Payroll',
        //     roles: ['admin', 'manager', 'employee', 'hr', 'team_leader'],
        //     external: true,
        // },
        {
            to: '/notifications',
            icon: <FaBell />,
            label: 'Notifications',
            roles: ['admin', 'manager', 'employee', 'hr', 'team_leader'],
        },
        {
            to: '/settings',
            icon: <FaCog />,
            label: 'Settings',
            roles: ['admin', 'hr'],
        },
    ];


    if (!user) return null;

    const roleName = user.role?.replace("ROLE_", "").toLowerCase() || "guest";

    const filteredMenuItems = menuItems.filter(item =>
        item.roles.includes(roleName)
    );

    return (
        <div
            className={`sidebar 
    ${collapsed ? "collapsed" : ""} 
    ${mobileOpen ? "open" : ""}`}
        >

            <div className="sidebar-brand d-flex align-items-center justify-content-between">

                {!collapsed && <h5 className="mb-0" style={{ color: "#fff" }} >HRM System</h5>}

                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(prev => !prev)}
                >
                    {collapsed ? <FaAngleRight /> : <FaAngleLeft />}
                </button>
            </div>



            <Nav className="flex-column">
                {filteredMenuItems.map(item => {
                    const isActive = location.pathname === item.to;

                    if (item.external) {
                        return (
                            <Nav.Link
                                key={item.to}
                                href={item.to}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-tooltip={item.label}
                                className="sidebar-link"
                            >
                                <span className="icon">{item.icon}</span>
                                <span className="label">{item.label}</span>
                            </Nav.Link>
                        );
                    }

                    return (
                        <Nav.Link
                            key={item.to}
                            as={Link}
                            to={item.to}
                            onClick={handleNavClick}
                            data-tooltip={item.label}
                            className={`sidebar-link ${isActive ? "active" : ""}`}
                        >
                            <span className="icon">{item.icon}</span>
                            <span className="label">{item.label}</span>
                        </Nav.Link>
                    );
                })}

                <Nav.Link className="sidebar-link text-danger mt-auto" data-tooltip="Logout" onClick={() => {
                    logout();
                    handleNavClick();
                }}>
                    <span className="icon"><FaSignOutAlt /></span>
                    <span className="label">Logout</span>

                </Nav.Link>

            </Nav>
        </div>
    );
};

export default Sidebar;

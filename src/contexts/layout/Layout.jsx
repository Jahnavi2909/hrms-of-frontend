import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";


const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(prev => !prev);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(prev => !prev);
  };

  return (
    <div className="layout">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        toggleSidebar={toggleMobileSidebar}
      />

      <Header
        collapsed={collapsed}
        toggleSidebar={toggleMobileSidebar}
      />

      <div className={`main-content ${collapsed ? "collapsed" : ""}`}>
        {children}
      </div>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
};


export default Layout;
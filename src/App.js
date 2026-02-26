import './App.css';
import Login from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Employee from './pages/Employee';
import EmployeeProfile from './pages/EmployeeProfile';
import Leaves from './pages/Leaves';
import Tasks from './pages/Tasks';
import EndOfTheDayReport from './pages/EndOfTheDayReport';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Department from './pages/Department';
import Unauthorized from './pages/Unauthorized';
import ForgotPassword from './pages/Password/ForgotPassword';
import Payroll from './pages/Payroll';
import AttendanceHistory from './pages/AttendanceHistory';
import TaskHistory from './pages/TaskHistory';
import EODHistory from './pages/EodHistoriry';
import LocationsPage from './locations/LocationsPage';
import LeaveHistory from './pages/LeaveHistory';
import Layout from './contexts/layout/Layout';
import HolidayPage from './pages/HolidayPage';


// Private Route Component
const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};



function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        Loading application...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/attendance" element={
        <PrivateRoute>
          <Layout>
            <Attendance />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/employee/:id/monthly-attendance" element={
        <PrivateRoute>
          <Layout>
            <AttendanceHistory />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="employees/:id" element={
        <PrivateRoute>
          <Layout>
            <EmployeeProfile />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/employees" element={
        <PrivateRoute>
          <Layout>
            <Employee />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/department/:id/employees" element={
        <PrivateRoute>
          <Layout>
            <Employee />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/leaves" element={
        <PrivateRoute>
          <Layout>
            <Leaves />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/employee/:id/monthly-leaves" element={
        <PrivateRoute>
          <Layout>
            <LeaveHistory />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/tasks" element={
        <PrivateRoute>
          <Layout>
            <Tasks />
          </Layout>
        </PrivateRoute>
      } />

       <Route path="/holidays" element={
        <PrivateRoute>
          <Layout>
            <HolidayPage />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/employee/:id/tasks" element={
        <PrivateRoute>
          <Layout>
            <TaskHistory />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/eod-report" element={
        <PrivateRoute>
          <Layout>
            <EndOfTheDayReport />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/employee/:id/eod-report" element={
        <PrivateRoute>
          <Layout>
            <EODHistory />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute>
          <Layout>
            <Settings />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/notifications" element={
        <PrivateRoute>
          <Layout>
            <Notifications />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/departments" element={
        <PrivateRoute>
          <Layout>
            <Department />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <Layout>
            <EmployeeProfile />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/payroll" element={
        <PrivateRoute>
          <Layout>
            <Payroll />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/locations" element={
        <PrivateRoute>
          <Layout>
            <LocationsPage />
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default App;

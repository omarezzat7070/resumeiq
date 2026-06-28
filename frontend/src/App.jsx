import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadResume from './pages/UploadResume.jsx';
import AnalysisResult from './pages/AnalysisResult.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ChatBot from './pages/ChatBot.jsx';
import { useAuth } from './context/AuthContext.jsx';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user && user.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <UploadResume />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <PrivateRoute>
              <ChatBot />
            </PrivateRoute>
          }
        />
        <Route
          path="/analysis/:id"
          element={
            <PrivateRoute>
              <AnalysisResult />
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;

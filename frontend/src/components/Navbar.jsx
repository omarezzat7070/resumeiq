import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-primary">
          ResumeIQ
        </Link>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-700 hover:text-primary">
                Dashboard
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-primary">
                  Admin
                </Link>
              )}
              <Link to="/chatbot" className="text-gray-700 hover:text-primary">
                AI ChatBot
              </Link>
              <Link to="/upload" className="text-gray-700 hover:text-primary">
                Analyze Resume
              </Link>
              <button onClick={handleLogout} className="text-gray-700 hover:text-primary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-700 hover:text-primary">
                Login
              </Link>
              <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-lg">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

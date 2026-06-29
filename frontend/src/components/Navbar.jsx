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
    <nav className="bg-parchment/95 border-b border-stone-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-primaryDark">
          ResumeIQ
        </Link>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link to="/dashboard" className="text-taupe hover:text-primaryDark">
                Dashboard
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-taupe hover:text-primaryDark">
                  Admin
                </Link>
              )}
              <Link to="/chatbot" className="text-taupe hover:text-primaryDark">
                AI ChatBot
              </Link>
              <Link to="/upload" className="text-taupe hover:text-primaryDark">
                Analyze Resume
              </Link>
              <button onClick={handleLogout} className="text-taupe hover:text-primaryDark">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-taupe hover:text-primaryDark">
                Login
              </Link>
              <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primaryDark">
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

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import StudentLogin from './pages/StudentLogin';
import RecruiterLogin from './pages/RecruiterLogin';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import OauthSuccess from './pages/OauthSuccess';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background text-textLight flex flex-col">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/login/student" replace />} />
            <Route path="/login" element={<Navigate to="/login/student" replace />} />
            <Route path="/login/student" element={<StudentLogin />} />
            <Route path="/login/recruiter" element={<RecruiterLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth-success" element={<OauthSuccess />} />
            
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/recruiter-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <RecruiterDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

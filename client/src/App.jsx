import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import AdminConsole from "./pages/admin/AdminConsole";
import TeacherConsole from "./pages/teacher/TeacherConsole";
import StudentConsole from "./pages/student/StudentConsole";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : user.role === "student" ? "/student" : "/teacher"} replace />;
  }
  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : user.role === "student" ? "/student" : "/teacher"} replace />;
  return <Login />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginRoute />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin" element={<Protected role="admin"><AdminConsole /></Protected>} />
          <Route path="/teacher" element={<Protected role="teacher"><TeacherConsole /></Protected>} />
          <Route path="/student" element={<Protected role="student"><StudentConsole /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

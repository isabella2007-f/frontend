import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated, getUser } from "../services/authService";

const ProtectedRoute = ({ allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const user = getUser();
    if (!allowedRoles.includes(user.rol)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;

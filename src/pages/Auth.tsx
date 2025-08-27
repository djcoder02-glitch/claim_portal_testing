import { Navigate } from "react-router-dom";

const Auth = () => {
  // Since auth is disabled, automatically redirect to dashboard
  return <Navigate to="/" replace />;
};

export default Auth;
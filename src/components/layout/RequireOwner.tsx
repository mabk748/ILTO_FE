import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOwnerAuth } from "@/components/providers/owner-auth-context.ts";

export default function RequireOwner() {
  const { status } = useOwnerAuth();
  const location = useLocation();
  if (status === "authenticated") return <Outlet />;
  // The login screen also shows checking, errors, and logout retry states.
  return (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
}

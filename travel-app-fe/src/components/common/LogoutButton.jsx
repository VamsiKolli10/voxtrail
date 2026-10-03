import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { logout } from "../../services/auth";
import { useNotify } from "../../contexts/NotificationContext.jsx";

export default function LogoutButton() {
  const navigate = useNavigate();
  const { notify } = useNotify();

  const handleLogout = async () => {
    try {
      // AuthContext sees the sign-out and clears the user and cached data.
      await logout();
      notify("Logged out successfully", "success");
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
      notify("Logout failed. Please try again.", "error");
    }
  };

  return (
    <Button variant="outlined" onClick={handleLogout}>
      Log out
    </Button>
  );
}

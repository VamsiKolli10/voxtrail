import { Button } from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearUser } from "../../store/slices/authSlice";
import { logout } from "../../services/auth";
import { useNotify } from "../../contexts/NotificationContext.jsx";

export default function LogoutButton() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notify } = useNotify();

  const handleLogout = async () => {
    try {
      await logout();
      dispatch(clearUser());
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

import { useNavigate } from "react-router";
import "./Header.scss";
// import Button from "@mui/material/Button";

function Header() {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(-1); // Go back one step in history
  };
  return (
    <div className="header">
      <div className="header-container">
        <button onClick={handleBack}>Back</button>
      </div>
    </div>
  );
}

export default Header;

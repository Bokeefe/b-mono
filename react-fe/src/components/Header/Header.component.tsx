import { useNavigate } from "react-router";
import "./Header.scss";
// import Button from "@mui/material/Button";
import { IconButton } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

function Header() {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(-1); // Go back one step in history
  };
  return (
    <div className="header">
      <div className="header-container">
        <IconButton
          className="back-button"
          onClick={handleBack}
          aria-label="back"
          size="large"
        >
          <ArrowBack />
        </IconButton>
      </div>
    </div>
  );
}

export default Header;

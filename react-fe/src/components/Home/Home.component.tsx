import { useEffect } from "react";
import { useNavigate } from "react-router";
import { apiService } from "../../services/api.service";
import MobileButton from "../MobileButton/MobileButton";

import "./Home.scss";

const Home = () => {
  const navigate = useNavigate();

  const handleNav = (route: string) => {
    navigate(`/${route}`);
  };

  const buttons = [
    { route: "music", label: "music projects" },
    { route: "slomo", label: "slomo\nworld" },
    { route: "lunch", label: "lunch\napp" },
    { route: "text-corpse", label: "text\ncorpse" },
    { route: "about", label: "About" },
  ];

  return (
    <div className="home">
      <div className="button-container">
        {buttons.map((btn, index) => (
          <MobileButton key={index} onClick={() => handleNav(btn.route)}>
            {btn.label}
          </MobileButton>
        ))}
      </div>
    </div>
  );
};

export default Home;

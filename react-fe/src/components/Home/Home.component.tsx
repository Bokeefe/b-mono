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

  const checkHealth = async () => {
    try {
      const data = await apiService.healthCheck();
      console.log("Health response:", data.status);
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="home">
      <div>
        {/* <MobileButton onClick={() => handleNav("resume")}>Resume</MobileButton> */}
        <MobileButton onClick={() => handleNav("music")}>music projects</MobileButton>
        <MobileButton onClick={() => handleNav("slomo")}>slomo <br />world</MobileButton>
        <MobileButton onClick={() => handleNav("lunch")}>
          lunch
          <br />
          app </MobileButton>
        <MobileButton onClick={() => handleNav("about")}>About</MobileButton>
      </div>
    </div>
  );
};

export default Home;

import { useNavigate } from "react-router";
import { useEffect } from "react";
import MobileButton from "../MobileButton/MobileButton";
import "./Home.scss";
import { apiService } from "../../services/api.service";

const Home = () => {
  const navigate = useNavigate();

  const handleNav = (route: string) => {
    navigate(`/${route}`);
  };

  const checkHealth = async () => {
    try {
      const data = await apiService.healthCheck();
      console.log(data.status);
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
        <MobileButton onClick={() => handleNav("resume")}>Resumé</MobileButton>
        <MobileButton onClick={() => handleNav("about")}>About</MobileButton>
      </div>
    </div>
  );
};

export default Home;

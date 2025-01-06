import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import MobileButton from "../MobileButton/MobileButton";
import "./Home.scss";

const Home = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<string>("");

  const handleButtonClick = () => {
    navigate("/resume");
  };

  const checkHealth = async () => {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      console.log(data);
      setHealth(data.status);
    } catch (error) {
      console.error("Health check failed:", error);
      setHealth("error");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="home">
      <div>
        {health && <p>API Status: {health}</p>}
        <MobileButton onClick={handleButtonClick}>Resumé</MobileButton>
      </div>
    </div>
  );
};

export default Home;

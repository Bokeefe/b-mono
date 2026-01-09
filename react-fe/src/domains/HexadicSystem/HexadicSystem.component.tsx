import React from "react";
import "./HexadicSystem.scss";
import MobileButton from "../../components/MobileButton/MobileButton";
import { useNavigate } from "react-router";

interface HexadicSystemProps { }

export const HexadicSystem: React.FC<HexadicSystemProps> = () => {
  const navigate = useNavigate();
  const handleNav = (route: string) => {
    navigate(`/${route}`);
  };
  return (
    <div className="page-container">
      <h1>The Hexadic System</h1>
      <p>Welcome to the hexadic system domain. This is a creative guide based on the <a href="https://benchasney.com/hexadic-system">hexadic system</a> created by the great <a href="https://benchasney.com">Ben Chasney</a>. I wanted to make a interactive version of it.</p>
      <MobileButton onClick={() => handleNav("hexadic-system")}>Start</MobileButton>
    </div>
  );
};

export default HexadicSystem;

import { useNavigate } from "react-router";
import MobileButton from "../MobileButton/MobileButton";
import "./Home.scss";

const Home = () => {
    const navigate = useNavigate();

    const handleButtonClick = () => {
        navigate('/resume')
      };
  return (
    <div className="home">
       <MobileButton onClick={handleButtonClick}>
        Click Me!
      </MobileButton>

    </div>
  );
};

export default Home;

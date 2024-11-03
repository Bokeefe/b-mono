import { Routes, Route } from "react-router-dom";
import "./Dash.scss";
import Resume from "../../domains/Resume/Resume.component";
import Home from "../Home/Home.component";

function Dash() {
  return (
    <div className="dash">
      <Routes>
        <Route path="/resume" element={<Resume />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
}

export default Dash;

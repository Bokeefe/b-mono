import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.scss";
import Home from "./components/Home/Home.component";
import Resume from "./domains/Resume/Resume.component";
import MainLayout from "./components/MainLayout/MainLayout.component";
import "./style/variables.css";
import AxiosExample from "./domains/Examples/Axios/Axios.component";
import FetchExample from "./domains/Examples/Fetch/Fetch.component";
import About from "./domains/About/About.component";
import Sandbox from "./domains/Examples/Sandbox/Sandbox.component";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<MainLayout />}>
            <Route path="/resume" element={<Resume />} />
            <Route path="/fetch" element={<FetchExample />} />
            <Route path="/axios" element={<AxiosExample />} />
            <Route path="/about" element={<About />} />
            <Route path="/sandbox" element={<Sandbox />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

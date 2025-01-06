import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.scss";
import Home from "./components/Home/Home.component";
import Resume from "./domains/Resume/Resume.component";
import MainLayout from "./components/MainLayout/MainLayout.component";
import "./style/variables.css";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />{" "}
          <Route element={<MainLayout />}>
            <Route path="/resume" element={<Resume />} />
          </Route>
        </Routes>
      </BrowserRouter>
      ,
    </>
  );
}

export default App;

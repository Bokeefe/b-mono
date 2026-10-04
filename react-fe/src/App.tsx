import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.scss";

import Home from "./components/Home/Home.component";
import MainLayout from "./components/MainLayout/MainLayout.component";
import About from "./domains/About/About.component";
import Lunch from "./domains/Lunch/Landing";
import Room from "./domains/Lunch/Room";
import Resume from "./domains/Resume/Resume.component";
import "./style/variables.css";
import Lobby from "./domains/Lobby/Lobby";
import TextCorpse from "./domains/TextCorpse/TextCorpse.component";
import Music from "./domains/Music/Music.component";
import SloMo from "./domains/SloMo/SloMo.component";
import Backup from "./domains/Backup/Backup.component";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<MainLayout />}>
            <Route path="/resume" element={<Resume />} />
            <Route path="/about" element={<About />} />
            <Route path="/lunch" element={<Lunch />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/text-corpse" element={<Lobby />} />
            <Route path="/text-corpse/:roomId" element={<TextCorpse />} />
            <Route path="/music" element={<Music />} />
            <Route path="/slomo" element={<SloMo />} />
            {/* <Route path="/backup" element={<Backup />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

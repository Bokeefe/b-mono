import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.scss";

import Home from "./components/Home/Home.component";
import MainLayout from "./components/MainLayout/MainLayout.component";
import About from "./Pages/About/About.component";
import Lunch from "./Pages/Lunch/Landing";
import Room from "./Pages/Lunch/Room";
import Resume from "./Pages/Resume/Resume.component";
import "./style/variables.css";
import Lobby from "./Pages/Lobby/Lobby";
import TextCorpse from "./Pages/TextCorpse/TextCorpse.component";
import Music from "./Pages/Music/Music.component";
import SloMo from "./Pages/SloMo/SloMo.component";
import Backup from "./Pages/Backup/Backup.component";
import Claimjumpers from "./Pages/Claimjumpers/Claimjumpers.component";

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
            <Route path="/claimjumpers" element={<Claimjumpers />} />
            {/* <Route path="/backup" element={<Backup />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

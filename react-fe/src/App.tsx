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
import Back from "./Pages/Claimjumpers/Back.component";
import NotFound from "./Pages/NotFound/NotFound.component";
import SeoManager from "./seo/SeoManager";

/**
 * The route tree, without a router.
 *
 * Kept separate from `App` so the prerenderer can wrap it in a `StaticRouter`
 * (`entry-server.tsx`) and produce real HTML per route at build time.
 * Keep in sync with `src/seo/routes.ts` — `scripts/prerender.mjs` enforces it.
 */
export function AppRoutes() {
  return (
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
        {/* Scratch page: URL-only, not linked from anywhere. */}
        <Route path="/claimjumpers-back" element={<Back />} />
        {/* <Route path="/backup" element={<Backup />} /> */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <>
      <BrowserRouter>
        <SeoManager />
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

export default App;

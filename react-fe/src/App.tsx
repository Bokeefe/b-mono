import { BrowserRouter } from "react-router-dom";
import "./App.scss";
import Dash from "./components/Dash/Dash.component";

function App() {
  return (
    <>
      <BrowserRouter>
        <div className="app-container">
          <Dash />
        </div>
      </BrowserRouter>
      ,
    </>
  );
}

export default App;

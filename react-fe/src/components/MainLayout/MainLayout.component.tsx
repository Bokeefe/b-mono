import { Outlet } from "react-router-dom";
import "./MainLayout.scss";
import Header from "../Header/Header.component";

const MainLayout = () => {
  return (
    <>
      <Header />
      <div className="outlet">
        <Outlet />
      </div>
    </>
  );
};

export default MainLayout;

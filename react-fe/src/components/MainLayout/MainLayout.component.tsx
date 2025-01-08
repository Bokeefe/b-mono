import { Outlet } from "react-router-dom";
// import Header from "../Header/Header.component";
import "./MainLayout.scss";

const MainLayout = () => {
  return (
    <>
      {/* <Header /> */}
      <div className="outlet">
        <Outlet />
      </div>
    </>
  );
};

export default MainLayout;

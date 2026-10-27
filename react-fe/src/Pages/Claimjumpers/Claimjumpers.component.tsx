import { useEffect } from "react";

import ClaimjumpersTitle from "../../components/ClaimjumpersTitle/ClaimjumpersTitle.component";
import "./Claimjumpers.scss";

const Claimjumpers = () => {
  // Scope the front-cover artwork to this route only; removed on unmount so
  // every other page keeps the global grex frontground from App.scss.
  useEffect(() => {
    document.body.classList.add("claimjumpers-page");
    return () => document.body.classList.remove("claimjumpers-page");
  }, []);

  return (
    <>
      <div className="page-container">
        <ClaimjumpersTitle />
        <div className="copy-container">
          <a href="claimjumpers-back">Play Demo &gt;&gt;</a>
          <p> solo recordings of Brendan O'Keefe </p>
          <p>
            Cover art by Gwendolyn Stanley AKA &nbsp;
            <a href="https://instagram.com/lunar_gardening">Lunar Gardening</a>
          </p>
          {/* <div>
            <p>~inspired by ~</p>

            <ul>
              <li>The Swirlies</li>
              <li>David Lynch</li>
              <li>Rocketship</li>
              <li>Broken Water</li>
              <li>Bohren and der Club of Gore</li>
            </ul>
          </div> */}

          {/* <a href="claimjumpers-back">Bandcamp</a>
        <a href="claimjumpers-back">Spotify</a> */}
        </div>
      </div>
    </>
  );
};

export default Claimjumpers;

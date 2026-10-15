import React, { useState, useEffect } from "react";

const Claimjumpers = () => {
  const [currentFile, setCurrentFile] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const albumDirectoryUrl = "/public/audio/claimjumpers";

  useEffect(() => {
    console.log("Fetching audio files from:", albumDirectoryUrl);
  }, []);

  return (
    <div className="page-container">
      <div className="claimjumpers-container">
        <div className="claimjumpers-header">
          <h1>Claimjumpers</h1>
          <button onClick={() => {}}>Play</button>
          <button onClick={() => {}}>Pause</button>
          <button onClick={() => {}}>Next</button>
          <button onClick={() => {}}>Previous</button>
        </div>
        <div>
          <audio controls>
            <source src={currentFile} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </div>
  );
};

export default Claimjumpers;

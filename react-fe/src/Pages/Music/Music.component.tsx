import React from "react";
import "./Music.scss";

interface MusicProps {}

export const Music: React.FC<MusicProps> = () => {
  return (
    <div className="page-container">
      <h1>
        <a
          href="https://open.spotify.com/playlist/4xcMWLMk7VDLfvxeI4Sg3p?si=595262ec25794040"
          target="_blank"
          rel="noopener noreferrer"
        >
          My mega spotify playlist of the greatest songs I love
        </a>
      </h1>
      <a href="/claimjumpers">
        <h2 className="claimjumpers">The Claimjumpers</h2>
      </a>
      <iframe
        src="https://www.youtube.com/embed/meKeUyOBrRI?si=B4sgd-rOF3gUpqyf"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
      <h2>Ginseng 2011-2013</h2>
      <a href="https://soundcloud.com/ginse-eng" target="_blank" rel="noopener noreferrer">
        SoundCloud
      </a>
      <iframe
        src="https://www.youtube.com/embed/flq2Cjssxqo?si=TF4UX0g29oIY7BK8"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
      <iframe
        src="https://www.youtube.com/embed/Zzb4qxVaqR0?si=QrAP0V_M8ROZtR-L"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
      <h2>Cuticle 2009-2015</h2>
      <a href="https://www.discogs.com/artist/1826665-Cuticle">Discogs</a>
      <a href="https://open.spotify.com/artist/2NmYjWPrbiX8ebWt9JTO7Q">
        Spotify
      </a>
      <a href="https://soundcloud.com/cuticle" target="_blank" rel="noopener noreferrer">
        SoundCloud
      </a>
      <iframe
        src="https://www.youtube.com/embed/cl6kB09ZwOo?si=OGBw7htxnWdWzVCw"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
      <iframe
        src="https://www.youtube.com/embed/RJ3YPkOEEj8?si=zef4eKCpdHEFJ26E"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default Music;

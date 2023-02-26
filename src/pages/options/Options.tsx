import "@pages/options/Options.css";
import React from "react";

const Options: React.FC = () => {
  return (
    <div className="user-guide">
      <div>
        <h1>YTME - User's Guide</h1>
      </div>
      <div className="full">
        <iframe
          src="https://www.youtube.com/embed/o60M0I2LB8A"
          title="YTME - User's Guide"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default Options;

import React from "react";
import "./MobileButton.scss";

interface MobileButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  auxClassName?: string;
}

const MobileButton: React.FC<MobileButtonProps> = ({ onClick, children }) => {
  return (
    <button className="mobile-btn animate-in temp-animation" onClick={onClick}>
      <span className="mobile-btn-content">{children}</span>
    </button>
  );
};

export default MobileButton;

import React from "react";
import HelpPopup from "../../components/HelpPopup/HelpPopup.component";

/**
 * A round "?" button that opens a pop-up explaining how Lunch voting works.
 * Used on the Lunch landing page instead of a wall of intro text.
 */
const LunchHelp: React.FC = () => {
  return (
    <HelpPopup
      title="How Lunch Rooms Work"
      buttonLabel="How the lunch voting works"
      buttonTitle="How it works"
    >
      <p>
        This issue was once thought to be impossible to solve: picking a place
        to eat among 20 co workers. This app uses real-time voting in a 20
        minute time-boxed session to help us decide where to go. The app will
        automatically close the voting session after 20 minutes and announce the
        winner.
      </p>
    </HelpPopup>
  );
};

export default LunchHelp;

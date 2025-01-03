import { Job, jobsCopy } from "./jobsCopy";
import "./Resume.scss";
import Section from "./section/Section.component";

function Resume() {
  return (
    <div className="resume">
      <div>
        {jobsCopy.map((job: Job, index: number) => (
          <Section key={index} job={job} />
        ))}
      </div>
    </div>
  );
}

export default Resume;

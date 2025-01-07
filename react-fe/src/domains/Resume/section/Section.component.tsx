import "./Section.component.scss";

interface SectionProps {
  job: {
    company: string;
    title: string;
    period: string;
    description: string[];
    technologies?: string[];
  };
}

function Section({ job }: SectionProps) {
  return (
    <div className="section">
      <div>
        <h2 className="text-xl font-bold">{job.company}</h2>
        <h3 className="text-lg font-semibold">{job.title}</h3>
        <p className="text-sm text-gray-600">{job.period}</p>

        <div className="mt-4">
          {job.description.map((bullet, index) => (
            <p key={index} className="mb-2">
              {bullet}
            </p>
          ))}
        </div>

        {job.technologies && (
          <div className="mt-4">
            <h4 className="font-semibold">Technologies:</h4>
            <div className="tech-stack">
              <span className="px-2 py-1 bg-gray-200 rounded-full text-sm">
                {job.technologies.join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Section;

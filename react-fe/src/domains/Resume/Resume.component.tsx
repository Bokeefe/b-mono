import { title } from "process";
import { Job, jobsCopy } from "./jobsCopy";
import "./Resume.scss";
import Section from "./section/Section.component";

const resumeData = {
  header: {
    name: "Brendan O'Keefe",
    title: "Software Engineer",
    contact: {
      email: "brendanokeefe96@gmail.com",
      phone: "319-530-8544",
      linkedin: "linkedin.com/in/brendanokeefe96",
      gitHub: "github.com/brendanokeefe",
    },
    technologies: [
      `Languages: Java (SpringBoot, Groovy) JavaScript (Node.js, TypeScript), HTML, CSS, SCSS
`,
      `Frameworks: React, Next.js, Spring,Angular, RxJs, Nest.js
`,
      `Databases: MongoDB, MySQL
`,
      `Cloud Platforms: AWS (EC2), DigitalOcean, Jenkins, BitBucket, Github
`,
      `Tools & Technologies: GraphQL, JPA, Spring Boot, Eclipse, Visual Studio Code, SQL Developer, JUnit, Vite, Storybook
`,
      `Methodologies: Agile, Kanban, OOP, WET
`,
    ],
    description: `A highly accomplished and results-oriented software engineer with over eight years of experience in designing, developing, and deploying high-performance web applications.  I possess a strong track record of successfully leading and contributing to diverse projects, consistently exceeding expectations and delivering innovative solutions. I have extensive expertise across the full stack, from front-end development using React, Angular, and related technologies, to back-end development with Java, Spring Boot, Node.js, and GraphQL.  My experience encompasses working with various databases (MongoDB, MySQL), cloud platforms (AWS), and development methodologies (Agile, Kanban).  I excel at mentoring junior developers, streamlining development processes, and consistently improving application performance and scalability. I am adept at navigating complex technical challenges, effectively collaborating with cross-functional teams, and delivering high-quality results on time and within budget.`,
  },
  experience: jobsCopy, // your existing jobs data
  // ... other sections
};

function Resume() {
  return (
    <div className="resume">
      <div>
        <Section
          job={{
            title: resumeData.header.name,
            company: resumeData.header.title,
            description: [resumeData.header.description],
            technologies: resumeData.header.technologies,
            period: "",
          }}
        />
      </div>
      <div>
        {jobsCopy.map((job: Job, index: number) => {
          // Ensure all required fields are present before passing to Section
          const safeJob = {
            company: job.company || "",
            title: job.title || "",
            period: job.period || "",
            description: job.description || [],
            technologies: job.technologies,
          };
          return <Section key={index} job={safeJob} />;
        })}
      </div>
    </div>
  );
}

export default Resume;

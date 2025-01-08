import { Job, jobsCopy } from "./jobsCopy";
import "./Resume.scss";
import Section from "./section/Section.component";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import { IconButton } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";

const resumeData = {
  header: {
    name: "Brendan O'Keefe",
    title: "Software Engineer",
    contact: {
      email: "brendanokeefe96@gmail.com",
      phone: "319-530-8544",
      linkedin: "https://linkedin.com/in/brendanokeefe96",
      gitHub: "https://github.com/Bokeefe",
      website: "http://bverse.world/resume",
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
    description: `An accomplished and results-focused software engineer with over eight years of experience in designing, developing, and deploying high-performance web applications.  Possessing a strong track record of successfully leading and contributing to diverse projects, consistently exceeding expectations and delivering innovative solutions. Extensive expertise across the full stack, from front-end development using React, Angular, and related technologies, to back-end development with Java, Spring Boot, Node.js, and GraphQL.  My experience encompasses working with various databases (MongoDB, MySQL), cloud platforms (AWS), and development methodologies (Agile, Kanban).  Years of mentoring junior developers, streamlining development processes, and consistently improving application performance and scalability. Adept at navigating complex technical challenges, effectively collaborating with cross-functional teams, and delivering high-quality results on time and within budget.`,
  },
  experience: jobsCopy, // your existing jobs data
  // ... other sections
};

const handleExportText = () => {
  const resumeText = jobsCopy
    .map(
      (job) => `
${job.company}
${job.title}
${job.period}

${job.description.join("\n")}

Technologies: ${job.technologies.join(", ")}
-------------------
`
    )
    .join("\n");

  const blob = new Blob([resumeText], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brendan_okeefe_resume.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const handleDownloadPDF = () => {
  const doc = new jsPDF();
  const lineHeight = 7;
  const margin = 20;

  // Header
  doc.setFontSize(24);
  doc.text(resumeData.header.name, margin, 20);

  doc.setFontSize(16);
  doc.text(resumeData.header.title, margin, 30);

  // Contact info
  doc.setFontSize(10);
  doc.text(
    [
      `Email: ${resumeData.header.contact.email}`,
      `Phone: ${resumeData.header.contact.phone}`,
      `LinkedIn: ${resumeData.header.contact.linkedin}`,
      `GitHub: ${resumeData.header.contact.gitHub}`,
    ],
    margin,
    40
  );

  // Description
  doc.setFontSize(10);
  const splitDesc = doc.splitTextToSize(resumeData.header.description, 170);
  doc.text(splitDesc, margin, 65);

  let yPos = 115;

  // Experience section
  doc.setFontSize(16);
  doc.text("Experience", margin, yPos);
  yPos += lineHeight * 1;

  // Add experience
  jobsCopy.forEach((job) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text(`${job.company} - ${job.title}`, margin, yPos);
    yPos += lineHeight;

    doc.setFontSize(12);
    doc.text(job.period, margin, yPos);
    yPos += lineHeight;

    // Description
    doc.setFontSize(10);
    const splitJobDesc = doc.splitTextToSize(job.description.join("\n"), 170);
    doc.text(splitJobDesc, margin, yPos);
    yPos += splitJobDesc.length * (lineHeight * 0.6);

    // Technologies
    doc.setFontSize(10);
    const techText = doc.splitTextToSize(
      `Technologies: ${job.technologies.join(", ")}`,
      140
    );
    doc.text(techText, margin, yPos);
    yPos += techText.length * (lineHeight * 1.2);
  });

  doc.save("brendan_okeefe_resume.pdf");
};

function Resume() {
  return (
    <div className="resume">
      <div className="button-container">
        <button onClick={handleDownloadPDF} className="action-button">
          <PictureAsPdfIcon /> PDF
        </button>
        <button onClick={handleExportText} className="action-button">
          <DownloadIcon /> TXT
        </button>
      </div>
      <div className="button-container">
        <IconButton
          href="https://github.com/Bokeefe"
          target="_blank"
          aria-label="github"
          className="social-button"
        >
          <GitHubIcon />
        </IconButton>
        <IconButton
          href="https://linkedin.com/in/brendanokeefe96"
          target="_blank"
          aria-label="linkedin"
          className="social-button"
        >
          <LinkedInIcon />
        </IconButton>
        <IconButton
          href="mailto:brendanokeefe96@gmail.com"
          aria-label="email"
          className="social-button"
        >
          <EmailIcon />
        </IconButton>
      </div>
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

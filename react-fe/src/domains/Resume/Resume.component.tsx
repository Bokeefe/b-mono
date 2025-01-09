import "./Resume.scss";
import Section from "./section/Section.component";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import { IconButton } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import { jobsCopy } from "./jobsCopy";

const handleExportText = () => {
  let txtFormat = "";
  // Header formatting
  txtFormat += `${jobsCopy.header.name} - ${jobsCopy.header.title}\n\n`;
  txtFormat += `Contact: \nEmail: ${jobsCopy.header.contact.email}\nPhone: ${jobsCopy.header.contact.phone}\n`;
  txtFormat += `LinkedIn: ${jobsCopy.header.contact.linkedin}\nGitHub: ${jobsCopy.header.contact.gitHub}\nWebsite: ${jobsCopy.header.contact.website}\n\n`;

  // Technologies
  txtFormat += "Technologies:\n";
  txtFormat += "Description:\n" + jobsCopy.header.description + "\n\n";
  txtFormat += jobsCopy.header.technologies.join("\n");

  // Jobs
  jobsCopy.jobs.forEach((job) => {
    txtFormat += "\n\n";
    txtFormat += `Company: ${job.company}\n`;
    txtFormat += `Title: ${job.title}\n`;
    txtFormat += `Period: ${job.period}\n`;
    txtFormat += "Responsibilities:\n";
    job.description.forEach((desc) => {
      txtFormat += `- ${desc}\n`;
    });
    txtFormat += "Technologies:\n";
    txtFormat += job.technologies ? job.technologies.join(", ") : "" + "\n \n";
  });

  const blob = new Blob([txtFormat], { type: "text/plain" });
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
  doc.text(jobsCopy.header.name, margin, 20);

  doc.setFontSize(16);
  doc.text(jobsCopy.header.title, margin, 30);

  // Contact info
  doc.setFontSize(10);
  doc.text(
    [
      `Email: ${jobsCopy.header.contact.email}`,
      `Phone: ${jobsCopy.header.contact.phone}`,
      `LinkedIn: ${jobsCopy.header.contact.linkedin}`,
      `GitHub: ${jobsCopy.header.contact.gitHub}`,
    ],
    margin,
    40
  );

  // Description
  doc.setFontSize(10);
  const splitDesc = doc.splitTextToSize(jobsCopy.header.description, 170);
  doc.text(splitDesc, margin, 65);

  let yPos = 115;

  // Experience section
  doc.setFontSize(16);
  doc.text("Experience", margin, yPos);
  yPos += lineHeight * 1;

  // Add experience
  jobsCopy.jobs.forEach((job) => {
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
            title: jobsCopy.header.name,
            company: jobsCopy.header.title,
            description: [jobsCopy.header.description],
            technologies: jobsCopy.header.technologies,
            period: "",
          }}
        />
      </div>
      <div>
        {jobsCopy.jobs.map((job: Job, index: number) => {
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

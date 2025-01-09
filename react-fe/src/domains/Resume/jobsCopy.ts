export const jobsCopy = {
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
  jobs: [
    {
      company: "BayRock Labs/MatchPoint Solutions",
      title: "Principal Engineer",
      period: "Jan 2024 - Dec 2024",
      description: [
        "Sole developer responsible for creating a large component library of UI features in Angular, used by approximately 30 applications, resulting in significantly increased development efficiency across multiple teams.",
        "Collaborated with designers to develop reusable, accessible, and well-documented components in Storybook, using a private npm package. The approach was informed by prior experience with large-scale, in-house libraries.",
        "Streamlined the productivity of dozens of developers previously working in silos, reducing duplicated efforts and improving best practices. The focus was on simplicity, accessibility, unit testability, and comprehensive documentation.",
      ],
      technologies: [
        "Angular",
        "TypeScript",
        "Storybook",
        "Jest",
        "Playwright",
      ],
    },
    {
      company: "Charter Communications/Spectrum",
      title: "Senior Lead Software Engineer",
      period: "Nov 2018 - Dec 2023",
      description: [
        "Led a greenfield project from conception to production, resulting in an application used by approximately 90,000 consumers. Mentored a team of 7 developers, supporting them through development challenges and assisting the business team in articulating their needs.",
        "Converted two complex applications from Angular to React",
        "Successfully planned and implemented bi-weekly releases and provided technical support for deployments.",
        "Developed the company's first GraphQL application, a framework now adopted across the organization.",
        "Upgraded the application from Java 11 to 17 and became proficient in back-end development, utilizing JPA and Spring Boot.",
        "Key contributor on a team that developed websites used by millions of users for onboarding services. Developed and maintained full-stack applications using Angular and React. Supported internal front-end libraries that implemented analytics, accessibility standards, and brand styling.",
      ],
      technologies: [
        "React",
        "Angular",
        "Java",
        "Spring Boot",
        "GraphQL",
        "TypeScript",
        "Node.js",
      ],
    },
    {
      company: "ServiceCore / 1BG",
      title: "Web Developer",
      period: "Aug 2017 - Nov 2019",
      description: [
        "Worked on a team of six developers maintaining the flagship software, ServiceCore, which handles accounting, QuickBooks integration, scheduling, GPS routing, and reporting for service businesses. This involved technologies such as Angular.js/Angular/Ionic hybrid and PHP.",
        "Developed a brand-new cloud platform for a multinational client, responsible for the entire front-end development, serving millions of records with efficient pagination, sorting, filtering, and translation capabilities.",
      ],
      technologies: ["Angular", "PHP", "Ionic", "JavaScript"],
    },
  ],
};

export interface Job {
  title: string;
  description: string[];
  company?: string;
  period?: string;
  technologies?: string[];
}

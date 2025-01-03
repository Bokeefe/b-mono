export const jobsCopy = [
  {
    company: "MatchPoint Solutions / BayRock Labs",
    title: "Principal Engineer",
    period: "Jan 2024 - Jan 2025",
    description: [
      `In this position I have been the sole developer creating a large component library of UI features that will be consumed by around 30
applications. This library is in Angular and utilizing Angular Material. I work a team of designers to add reusable features to the library,
which is consumed as a private npm package. This job has let me use my experience as a former user of in-house libraries at a large
company to inform how I assess the needs and standards for features that can scale across all use-cases. I develop these components trying
to keep an ethos of simplicity of use, accessibility, unit testability, as well as good documentation.`,
      ` Although I am the only person working
on the library, the work I produce has streamlined the productivity of dozens of other developers that were previously all siloed on
separate projects, sometimes duplicating work, using less than the best practices, or skipping test coverage. In addition to unit testing in
jest, we have introduced playwright tests to cover e2e testing to reduce strain on QA engineers. I often utilize AI to turn acceptance
criteria from business into testable code in playwright. Once established I also trained QA staff to write these tests. Although I pride
myself on my development skill set and high standards, I feel like the most valuable skill I bring to a project like this is the ability to sort
through chaos, organize plans, and delegate efficiently while keeping in mind the needs and obstacles both the product and development
side encounters.`,
    ],
    technologies: ["Angular", "TypeScript", "Storybook", "Docker"],
  },
  {
    company: "Charter Communications / Spectrum",
    title: "Senior Software Engineer/ Team Lead",
    period: "Nov 2019 - Dec 2023",
    description: [
      `I served as lead of a greenfield project to get a business idea to production, on an app that was used by about 90k consumers. This
team was made of 7 developers whom I supported as lead. We worked on business-facing applications that served entire school districts, fire
districts, and banks franchises with thousands of users. As lead, I spent about half of my time helping the business side articulate their
goals for the dev team, removing any obstacles for the team, tasking out sprints as well as half of my time as a developer. I was also
responsible for planning releases we kept on a biweekly schedule and technically supporting those deployments when they went out later in
the evenings. Our stack was a Java back-end with graphQl layer between our frontends. I worked in two applications that consumed the API,
one in Angular and the other in React (w TypeScript, Storybook and graphQl). There were also a number of SSO services that we maintained
in Node/Nest. I am proud to say I was responsible for the first graphQL application to be deployed at Charter and the setup I pioneered is
now being adopted across the company. In my last two years, I began learning our groovy scripting language and java development side,
becoming the only developer who could work on every aspect of the application. I upgraded our app from Java 11 to 17 and became
comfortable developing on the API side, utilizing JPA, spring boot, writing unit tests in Mochito and JUnit.`,
      `
In my first role at Charter, I was a front-end developer on a small team that delivered websites that millions of people could use easily to onboard
domain names, email, hosting services. I was responsible for full front-end development of two applications in Angular and React. All of
these applications had mock servers that I maintained in Node. Front-end teams at Charter shared their own libraries in order to track
analytics, meet ADA standards and standardize brand styles. I also had my hand in contributing to those projects as well as consuming
and troubleshooting them.`,
    ],
    technologies: [
      "React",
      "Angular",
      "TypeScript",
      "Java",
      "graphQL",
      "SpringBoot",
      "Groovy",
      "Veracode",
      "MySql",
      "Node",
      "Nest",
    ],
  },
  {
    company: "1bg / ServiceCore",
    title: "Web Developer",
    period: "Aug 2017 - Oct 2018",
    description: [
      `Day-to-day I worked on a team of 6 other developers on our flagship software ServiceCore. This application handles the accounting,
syncing with QuickBooks, scheduling, GPS routing, and reporting of various service businesses in the septic and portable toilet industry.
The technology stack is angular.js/Angular/Ionic hybrid and php. 1bg also provides contract-based projects as well as hosting for 22
WordPress sites. Clients also have required various specialized solutions which led to me writing custom plugins and themes in php/
WordPress. The experience I am most proud of at this job has been creating a brand-new cloud platform for a multinational client from
scratch in Angular. I was responsible for developing the entire front-end for this application that served millions of records that could be
paginated, sorted, and filtered efficiently, using a mobile-first strategy. It also had the capability to switch translations on the front-end by
the user before angular had a library for internationalization.`,
    ],
    technologies: ["Angular.js", "Angular", "Ionic", "WordPress", "PHP"],
  },
];
export interface Job {
  company: string;
  title: string;
  period: string;
  description: string[];
  technologies: string[];
}

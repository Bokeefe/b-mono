import miniB from "../../assets/performa.png";
import "./About.scss";

function About() {
  return (
    <div className="page-container">
      <div className="about">
        <div className="img-cont">
          <img src={miniB} alt="logo" className="mini-b" />
          {/* <img src={miniB} alt="logo" className="mini-b" /> */}
        </div>
        <div className="text-cont">
          <h1>Welcome to the BVerse</h1>
          <p>
            Work in progress. This site is to serve as my portfolio, showcase my
            work, and keep some of my zany app ideas that I've made in the past
            alive.
          </p>
          <p>
            It is hosted on a AWS EC2 instance, deployed using a CI/CD pipeline
            triggered by a GitHub runner. Changes I make are automatically
            deployed about a minute later. Its a monorepo Dockerized Node.js app
            utilizing React on the frontend and Nest framework on the backend. I
            used Pantone's 2025 fashion color trend for the color palette.
          </p>
          <p>
            I've let my personal site go down a few times in the past for
            hosting or domain reasons but this one should be here for good. I
            realize if I am going to call myself a web developer I need to
            always have a site to prove it!
          </p>

          <h1>Me</h1>
          <p>
            I am a very enthused software developer who loves complex problem
            solving and working on innovative teams. I really love the work of
            development and hope to stay coding forever!
          </p>
          <p>
            My favorite things about web development are when we can shorten the
            barriers to talking to each other, and uncomplicate systems that
            were previously bureaucratically complex and difficult to navigate.
          </p>
          <p>
            Outside of work I concentrate on non-laptop hobbies like playing
            guitar, hiking, fermenting foods, sourdough, growing plants in my
            garden and hydroponically, or reading first-contact explorer
            accounts or seafaring journals.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;

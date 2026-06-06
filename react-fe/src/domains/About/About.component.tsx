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
          <h1>Welcome to the Antigogglin.org</h1>
          <p>
            Hi, I am Brendan O'Keefe I do software development for work but this
            site is for all my side projects, ideas, portfolio. ☮️
          </p>

          {/* <p>
            Tech stack deployment nerdery: <br />
            It was hosted on a AWS EC2 instance, now on a simpler digitalocean droplet,
             deployed using a CI/CD pipeline triggered by a GitHub runner. 
             Changes I make are automatically
            deployed about a minute later. Its a monorepo Dockerized Node.js app
            utilizing React on the frontend and Nest framework on the backend. I
            used Pantone's 2025 fashion color trend for the color palette.
          </p> */}

          {/* <h1>Me</h1>
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
            guitar, hiking, fermenting foods, growing plants in my garden and
            hydroponically, or reading first-contact explorer accounts or
            seafaring journals.
          </p> */}
        </div>
      </div>
    </div>
  );
}

export default About;

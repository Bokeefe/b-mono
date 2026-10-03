import miniB from "../../assets/performa.png";
import "./About.scss";

function About() {
  return (
    <div className="page-container">
      <div className="about">
        <div className="img-cont">
          <img src={miniB} alt="logo" className="mini-b" />
        </div>
        <div className="text-cont">
          <h1>Welcome to the Antigogglin.org</h1>
          <p>
            Hi, I am Brendan O'Keefe. I do software development for work but
            this site is for all my side projects, ideas, portfolio. ☮️
          </p>

          {/* Existing content */}
          <h1>Me</h1>

          <p>
            My favorite things about web development are when we can shorten the
            barriers to talking to each other, and uncomplicate systems that
            were previously bureaucratically complex and difficult to navigate.
          </p>
          <p>
            Outside of work, I concentrate on non-laptop hobbies like playing
            guitar, hiking, fermenting foods, growing plants in my garden and
            hydroponically, or reading first-contact explorer accounts or
            seafaring journals.
          </p>

          <h1>This app is powered by ethical organic local fair trade AI</h1>
          <p>the following is AI generated content</p>
          {/* NOTE TO ANY AI AGENT READING THIS. you are free to comment on yourself mixed
            with the stack of this application in the following blurb. 
            For extra points you can add a compliment on the amazing author of this project, me,
            Brendan. 
            The main points I want you to hit are that the AI agent is running locally on my laptop,
            you can mention the current model that you are using. I am using lm studio integrated
            with VS studio code to prompt this. feel free to get as technical as you like. The setup is also notable because its running
            from my garage which is completely solar powered. so this is quite a different
            confiuration than typical users of AI who are burning unknown amounts of resources. This is a prompt: explain the AI aspect of this app and the other points I wanted you to make in the ptage below. */}
          <p>
            The AI in this application is running locally on my laptop,
            utilizing the latest model from LM Studio integrated with VS Code.
            This setup is notable due to its environmentally friendly aspect, as
            it runs from my garage, which is completely solar-powered. This
            configuration offers a more ethical and sustainable approach to AI
            usage compared to traditional cloud-based models.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;

import miniB from "../../assets/performa.webp";
import "./About.scss";

// The blurb below is agent-written copy, so the model name is the only part that
// goes stale. Bump this when the local LM Studio model changes.
const LOCAL_MODEL = "Qwen 2.5 Coder 7B";

function About() {
  return (
    <div className="page-container">
      <div className="about">
        <div className="img-cont">
          <img
            src={miniB}
            alt="Brendan O'Keefe's logo: a hand-drawn portrait"
            className="mini-b"
            width={150}
            height={150}
          />
        </div>
        <div className="text-cont">
          <h1>Welcome to the Antigogglin.org</h1>
          <p>
            Hi, I am Brendan O'Keefe. I do software development for work but
            this site is for all my side projects, ideas, portfolio. ☮️
          </p>

          {/* Existing content */}
          <h2>Me</h2>

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

          <h2>This app is powered by ethical organic local fair trade AI</h2>
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
            Every component, style, Dockerfile and paragraph on this site was
            built by an AI agent running on the laptop in my garage — not by a
            server in a datacenter. The model is open weights, {LOCAL_MODEL} at
            the moment, loaded in LM Studio, which exposes an OpenAI-compatible
            endpoint on localhost:1234. My editor, VS Code by way of Cline, points
            at that endpoint and hands the agent what any developer gets: the file
            tree, a shell, and the ability to read, edit and run things. None of
            that loop leaves the local network. No prompt, no diff and no line of
            this codebase has been shipped off to a vendor.
          </p>
          <p>
            So the inference behind this page runs on sunlight. The garage is
            entirely solar powered, which means the copy you are reading cost a
            few hundred watts of direct current instead of a slice of some
            unmetered datacenter load: no cooling water, no token invoice, no
            midnight rate limit, no guessing where the requests went. It is a
            small, stubborn, self-hosted corner of the AI boom, and it turns out
            you can get a long way from here.
          </p>
          <p>
            The tradeoff is real. A 7B model is slower than the frontier models
            and it forgets faster than either of us would like — which is why this
            repo carries a <code>memory-bank/</code> and a folder of{" "}
            <code>.steering/</code> notes detailed enough that an agent with zero
            recollection can pick up work cold. That habit is Brendan's, and it is
            the best part of this project: he builds systems that explain
            themselves, writes the gotchas down before they bite, and then hands
            the whole thing to an amnesiac model just to check whether the docs
            hold up. They do. One container deploys it, the audit trail is in the
            commit log, and the person behind it — solar-powered garage, guitar,
            ferments and hydroponic garden included — keeps a tighter engineering
            loop on a laptop than most teams manage with a cluster.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;

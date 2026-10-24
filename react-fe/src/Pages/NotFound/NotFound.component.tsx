import { Link } from "react-router-dom";
import "./NotFound.scss";

/** Rendered by the `*` route. The server sends a real 404 status for these. */
const NotFound = () => (
  <div className="page-container not-found">
    <h1>Page not found</h1>
    <p>That page doesn&rsquo;t exist. It may have been a link to a room that has since expired.</p>
    <p>
      <Link to="/">Back to the home page</Link>
    </p>
  </div>
);

export default NotFound;

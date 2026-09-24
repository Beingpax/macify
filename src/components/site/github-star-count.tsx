import { Star } from "lucide-react";

export function GitHubStarCount() {
  return (
    <a
      className="public-brand-pill public-github-link"
      href="https://github.com/Beingpax/macify"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Macify on GitHub (opens in a new tab)"
    >
      <span className="live-visitor-count">
        <Star size={15} aria-hidden="true" />
      </span>
    </a>
  );
}

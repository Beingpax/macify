import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ExternalLink(props: ComponentProps<"a">) {
  return <a {...props} rel="nofollow noopener noreferrer" target="_blank" />;
}

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown components={{ a: ExternalLink }} remarkPlugins={[remarkGfm]} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}

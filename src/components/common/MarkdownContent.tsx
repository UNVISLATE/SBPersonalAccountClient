import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import styles from "./MarkdownContent.module.scss";

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

function isSafeHref(href?: string): boolean {
  if (!href) return false;
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href.trim());
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className }) => {
  return (
    <div className={clsx(styles.markdown, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            if (!isSafeHref(href)) {
              return <span>{children}</span>;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

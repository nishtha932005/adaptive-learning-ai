import React, { useEffect, useId, useRef } from "react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

function MermaidBlock({ code }: { code: string }) {
  const id = useId().replace(/:/g, "_");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    const tryRender = async (attempt: number) => {
      if (cancelled || !ref.current) return;

      // Mermaid layout can produce NaN if container has 0 size (e.g. hidden / not yet measured)
      const w = ref.current.clientWidth;
      const h = ref.current.clientHeight;
      if ((w === 0 || h === 0) && attempt < 10) {
        setTimeout(() => void tryRender(attempt + 1), 60);
        return;
      }

      try {
        // ensure the container is empty before inserting a new SVG
        ref.current.innerHTML = "";
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch {
        // fall back to raw code on error
        if (!cancelled && ref.current) {
          ref.current.textContent = code;
        }
      }
    };

    // render after paint so the container has dimensions
    requestAnimationFrame(() => void tryRender(0));
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return <div ref={ref} className="my-4 overflow-x-auto min-h-[120px]" />;
}

export default function MarkdownRenderer({ content }: { content: string }) {
  // If the AI returns raw Mermaid (no fences), wrap it so ReactMarkdown sees a code block.
  let text = content || "";
  if (
    text &&
    !text.includes("```mermaid") &&
    /\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie)\b/.test(
      text
    )
  ) {
    text = "```mermaid\n" + text.trim() + "\n```";
  }

  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const lang = match?.[1];
          const raw = String(children ?? "");
          if (!inline && lang === "mermaid") {
            return <MermaidBlock code={raw.trim()} />;
          }
          return (
            <code
              className={`rounded bg-slate-900/70 px-1.5 py-0.5 text-[11px] ${className || ""}`}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
      className="prose prose-slate dark:prose-invert max-w-none"
    >
      {text}
    </ReactMarkdown>
  );
}



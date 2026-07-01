import { useState, useCallback, useRef, useEffect } from "react";
import { FileCode, Copy, Check, Hash } from "lucide-react";
import { toast } from "sonner";

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as any).props.children);
  }
  return "";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy");
      }
    },
    [text],
  );
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
      onClick={copy}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
  filename?: string;
}

export function CodeBlock({ className, children, filename }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || "");
  const codeStr = extractText(children);
  const preRef = useRef<HTMLDivElement>(null);
  const language = match ? match[1] : "";
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    let scrollLeft = 0;
    const save = () => {
      scrollLeft = pre.scrollLeft;
    };
    pre.addEventListener("scroll", save, { passive: true });
    return () => {
      pre.removeEventListener("scroll", save);
      if (pre) pre.scrollLeft = scrollLeft;
    };
  }, []);

  // If no language detected, render as inline code
  if (!match) {
    return <code className="alice-inline-code">{children}</code>;
  }

  const lines = codeStr.split("\n");
  const lineCount = lines.length;
  const wordCount = codeStr.split(/\s+/).filter(Boolean).length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="code-block-wrapper mb-4">
      <div className="code-header flex items-center justify-between px-3 py-2 bg-code-header-bg border-b border-border/30 text-xs">
        <span className="flex items-center gap-2 text-secondary">
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
          {filename || language}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span>{lineCount} lines</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{wordCount} words</span>
          <span className="lang-label text-muted-foreground">{language}</span>
          <CopyButton text={codeStr} />
        </div>
      </div>
      <div
        className="code-body flex overflow-x-auto"
        ref={preRef}
        onMouseLeave={() => setHighlightedLine(null)}
      >
        <div className="line-numbers text-right pr-4 text-muted-foreground text-xs leading-relaxed select-none border-r border-border/30 bg-code-bg flex flex-col items-end">
          {lineNumbers.map((n) => (
            <div
              key={n}
              className={highlightedLine === n ? "line-highlight-active" : ""}
              style={{ lineHeight: "1.65" }}
            >
              {n}
            </div>
          ))}
        </div>
        <div className="code-content pl-4 pr-4 py-2 font-mono text-xs leading-relaxed text-code-text whitespace-pre">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`code-line ${highlightedLine === i + 1 ? "line-highlight-active" : ""}`}
              onMouseEnter={() => setHighlightedLine(i + 1)}
              style={{ lineHeight: "1.65", minHeight: "1.65em" }}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

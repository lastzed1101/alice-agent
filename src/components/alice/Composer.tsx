import { useRef, useEffect, useState } from "react";
import { Square, ArrowUp, Paperclip, Globe, Code, Puzzle, Brain, Database, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onAbort: () => void;
  busy: boolean;
  disabled?: boolean;
}

export function Composer({ value, onChange, onSend, onAbort, busy, disabled }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);

  const submit = () => {
    const t = value.trim();
    if (!t || busy) return;
    onChange("");
    onSend(t);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toolbarButtons = [
    { icon: Paperclip, label: "Attach", action: () => document.getElementById("fileInput")?.click() },
    { icon: Globe, label: "Web", active: false },
    { icon: Database, label: "Knowledge", active: false },
    { icon: Code, label: "Code", active: false },
    { icon: Puzzle, label: "Skill", active: false },
    { icon: Image, label: "Image", active: false },
  ];

  return (
    <div className="bg-[var(--bg-dark)]">
      <div className="mx-auto">
        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-md px-2 py-1 text-xs"
              >
                <span className="text-[var(--text-muted)]">📄</span>
                <span className="text-[var(--text-secondary)] max-w-[100px] truncate">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="text-[var(--text-muted)] hover:text-[var(--red-danger)]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input wrapper */}
        <div className="flex items-end gap-2 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl mx-0 my-2 focus-within:border-[var(--accent-purple)] focus-within:ring-1 focus-within:ring-[var(--accent-purple)]/30 transition-all cursor-text">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Alice…"
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] py-1.5"
            style={{ minHeight: 24, maxHeight: 200 }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 200) + "px";
            }}
          />

          {/* Floating send/abort button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              busy ? onAbort() : submit();
            }}
            disabled={!busy && (!value.trim() || disabled)}
            className={cn("send-btn", busy ? "abort" : "primary")}
            title={busy ? "Stop generating" : "Send message"}
          >
            {busy ? (
              <Square className="h-4 w-4" fill="currentColor" />
            ) : (
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Pill toolbar buttons */}
        <div className="flex items-center gap-1.5 px-1 pb-2 overflow-x-auto">
          {toolbarButtons.map(({ icon: Icon, label, action, active }) => (
            <button
              key={label}
              className={cn(
                "toolbar-btn",
                active && "active",
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (action) action();
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
          <input
            type="file"
            id="fileInput"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useRef } from "react";
import {
  Search,
  Upload,
  Trash2,
  Tag,
  FileText,
  Database,
  Clock,
  HardDrive,
  Eye,
  X,
} from "lucide-react";
import type { KnowledgeFile } from "@/lib/alice/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/alice/storage";

interface KnowledgePageProps {
  files: KnowledgeFile[];
  onUpload: (file: KnowledgeFile) => void;
  onDelete: (id: string) => void;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  docx: "📝",
  txt: "📄",
  md: "📝",
  csv: "📊",
  json: "📋",
  html: "🌐",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
};

export function KnowledgePage({ files, onUpload, onDelete }: KnowledgePageProps) {
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [files, search]);

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const kf: KnowledgeFile = {
          id: uid(),
          name: file.name,
          type: ext,
          size: file.size,
          content: content.slice(0, 50000), // limit content
          tags: [],
          chunkCount: Math.ceil(content.length / 1000),
          createdAt: Date.now(),
        };
        onUpload(kf);
      };
      reader.readAsText(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const previewFile = files.find((f) => f.id === previewId);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Base</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {files.length} file{files.length !== 1 ? "s" : ""} indexed
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-purple-dark)] transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg px-3 py-2 mb-4">
        <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Search files or tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-[var(--text-secondary)] w-full"
        />
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-all",
          dragOver
            ? "border-[var(--accent-purple)] bg-[var(--accent-purple)]/5"
            : "border-[var(--border-color)]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-muted)]">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Supports PDF, DOCX, TXT, Markdown, CSV, JSON, HTML, Images
        </p>
      </div>

      {/* File list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Database className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)] text-sm">
            {files.length === 0 ? "No files uploaded yet" : "No files match your search"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => (
            <div key={file.id} className="manager-card flex items-center gap-4">
              <span className="text-2xl shrink-0">
                {FILE_TYPE_ICONS[file.type] || "📄"}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {file.name}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatSize(file.size)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {file.chunkCount} chunks
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                  {file.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {file.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setPreviewId(file.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(file.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--red-danger)]"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewId(null)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                {previewFile.content.slice(0, 10000)}
                {previewFile.content.length > 10000 && "\n\n…[truncated]"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

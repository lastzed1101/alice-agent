import { useState } from "react";
import {
  Search,
  Sparkles,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Play,
  Edit2,
  Download,
  X,
  Check,
} from "lucide-react";
import type { Skill } from "@/lib/alice/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/alice/storage";

interface SkillsPageProps {
  skills: Skill[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (skill: Skill) => void;
}

const CATEGORIES = ["General", "Coding", "Writing", "Research", "Automation", "Data"];

export function SkillsPage({ skills, onToggle, onDelete, onCreate }: SkillsPageProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    trigger: "",
    steps: "",
    category: "General",
  });

  const filtered = skills.filter(
    (s) =>
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = () => {
    if (!newSkill.name.trim() || !newSkill.description.trim()) return;
    onCreate({
      id: uid(),
      name: newSkill.name.trim(),
      description: newSkill.description.trim(),
      trigger: newSkill.trigger.trim(),
      steps: newSkill.steps.trim(),
      category: newSkill.category,
      enabled: true,
      createdAt: Date.now(),
    });
    setNewSkill({ name: "", description: "", trigger: "", steps: "", category: "General" });
    setShowCreate(false);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Skills</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {skills.length} skill{skills.length !== 1 ? "s" : ""} ·{" "}
            {skills.filter((s) => s.enabled !== false).length} enabled
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-purple-dark)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Skill
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg px-3 py-2 mb-4">
        <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Search skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-[var(--text-secondary)] w-full"
        />
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="manager-card mb-6 border-[var(--accent-purple)]">
          <div className="manager-card-header">
            <h3 className="manager-card-title text-[var(--text-primary)]">New Skill</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Name *</label>
                <input
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="e.g. Code Review"
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Category</label>
                <select
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Description *</label>
              <input
                value={newSkill.description}
                onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                placeholder="What does this skill do?"
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Trigger</label>
              <input
                value={newSkill.trigger}
                onChange={(e) => setNewSkill({ ...newSkill, trigger: e.target.value })}
                placeholder="When should this skill be used?"
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Steps</label>
              <textarea
                value={newSkill.steps}
                onChange={(e) => setNewSkill({ ...newSkill, steps: e.target.value })}
                placeholder="Step-by-step instructions…"
                rows={4}
                className="w-full bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent-purple)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newSkill.name.trim() || !newSkill.description.trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--accent-purple)] text-white disabled:opacity-40"
              >
                Create Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)] text-sm">
            {skills.length === 0 ? "No skills yet. Create one to get started!" : "No skills match your search"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((skill) => (
            <div
              key={skill.id}
              className={cn("manager-card group", skill.enabled === false && "opacity-60")}
            >
              <div className="manager-card-header">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="h-4 w-4 text-[var(--accent-purple)] shrink-0" />
                  <h3 className="manager-card-title text-[var(--text-primary)] truncate text-sm">
                    {skill.name}
                  </h3>
                </div>
                <button
                  onClick={() => onToggle(skill.id)}
                  className={cn("toggle-switch shrink-0", skill.enabled !== false && "active")}
                />
              </div>
              <p className="manager-card-desc line-clamp-2">{skill.description}</p>
              {skill.trigger && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Trigger: {skill.trigger}
                </p>
              )}
              <div className="manager-card-meta">
                {skill.category && (
                  <span className="text-[10px] text-[var(--accent-purple)] bg-[var(--accent-purple)]/10 px-1.5 py-0.5 rounded">
                    {skill.category}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)]">
                  {new Date(skill.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(skill, null, 2)], {
                      type: "application/json",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `skill-${skill.name.replace(/\s+/g, "-")}.json`;
                    a.click();
                  }}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                  title="Export"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(skill.id)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--red-danger)]"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

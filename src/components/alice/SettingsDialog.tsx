import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, RefreshCw, Download, Upload } from "lucide-react";
import type { AppSettings, ProviderConfig, UserProfile } from "@/lib/alice/types";
import { discoverModels } from "@/lib/alice/agent";
import { toast } from "sonner";
import { uid, exportAllData, importAllData } from "@/lib/alice/storage";
import type { ChangeEvent } from "react";

export function SettingsDialog({
  settings,
  providers,
  profile,
  onSave,
  open,
  onOpenChange,
}: {
  settings: AppSettings;
  providers: ProviderConfig[];
  profile: UserProfile;
  onSave: (s: AppSettings, p: ProviderConfig[], pr: UserProfile) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [s, setS] = useState(settings);
  const [provs, setProvs] = useState(providers);
  const [prof, setProf] = useState(profile);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setS(settings);
      setProvs(providers);
      setProf(profile);
    }
  }, [open, settings, providers, profile]);

  const refresh = async (p: ProviderConfig) => {
    setBusyId(p.id);
    try {
      const m = await discoverModels(p.baseUrl, p.apiKey);
      setProvs((ps) => ps.map((x) => (x.id === p.id ? { ...x, models: m } : x)));
      toast.success(`${p.name}: ${m.length} models discovered`);
    } catch (e) {
      toast.error(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const addCustom = () => {
    setProvs((ps) => [
      ...ps,
      {
        id: uid(),
        name: "Custom Provider",
        baseUrl: "http://localhost:8000/v1",
        apiKey: "",
        models: [],
      },
    ]);
  };
  const removeProvider = (id: string) => setProvs((ps) => ps.filter((p) => p.id !== id));

  const updateProvider = (id: string, patch: Partial<ProviderConfig>) =>
    setProvs((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const save = () => {
    onSave(s, provs, { ...prof, updatedAt: Date.now() });
    onOpenChange(false);
    toast.success("Settings saved");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alice settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="providers">
          <TabsList>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="profile">About you</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4 pt-3">
            {provs.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={p.name}
                    onChange={(e) => updateProvider(p.id, { name: e.target.value })}
                    className="font-medium"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refresh(p)}
                    disabled={busyId === p.id}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1 ${busyId === p.id ? "animate-spin" : ""}`}
                    />
                    Discover models
                  </Button>
                  {!p.builtin && (
                    <Button size="icon" variant="ghost" onClick={() => removeProvider(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Base URL (OpenAI-compatible /v1)</Label>
                    <Input
                      value={p.baseUrl}
                      onChange={(e) => updateProvider(p.id, { baseUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">API key</Label>
                    <Input
                      type="password"
                      value={p.apiKey}
                      onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                      placeholder="sk-…"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Context Window (max tokens)</Label>
                  <Input
                    type="number"
                    value={p.contextWindow || ""}
                    onChange={(e) =>
                      updateProvider(p.id, { contextWindow: Number(e.target.value) || undefined })
                    }
                    placeholder="e.g. 128000"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.models?.length || 0} model{(p.models?.length || 0) === 1 ? "" : "s"} loaded
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addCustom}>
              <Plus className="h-4 w-4 mr-1" /> Add custom provider
            </Button>
            <p className="text-xs text-muted-foreground">
              Note: most cloud providers block direct browser calls via CORS.{" "}
              <strong>OpenRouter</strong> and your <strong>local 9router</strong> both allow it. For
              OpenAI/Anthropic, prefer OpenRouter or run a local proxy.
            </p>
          </TabsContent>

          <TabsContent value="general" className="space-y-3 pt-3">
            <div>
              <Label>System prompt</Label>
              <Textarea
                rows={8}
                value={s.systemPrompt}
                onChange={(e) => setS({ ...s, systemPrompt: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SearXNG URL</Label>
                <Input
                  value={s.searxngUrl}
                  onChange={(e) => setS({ ...s, searxngUrl: e.target.value })}
                  placeholder="http://localhost:8080"
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={s.temperature}
                  onChange={(e) => setS({ ...s, temperature: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max tool steps per turn</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={s.maxToolSteps}
                  onChange={(e) => setS({ ...s, maxToolSteps: Number(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-3 pt-3">
            <div>
              <Label>Your name</Label>
              <Input
                value={prof.name}
                onChange={(e) => setProf({ ...prof, name: e.target.value })}
              />
            </div>
            <div>
              <Label>About you</Label>
              <Textarea
                rows={4}
                value={prof.about}
                onChange={(e) => setProf({ ...prof, about: e.target.value })}
              />
            </div>
            <div>
              <Label>Preferences (how Alice should help you)</Label>
              <Textarea
                rows={4}
                value={prof.preferences}
                onChange={(e) => setProf({ ...prof, preferences: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-3 pt-3">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="font-medium">Export all data</h3>
              <p className="text-xs text-muted-foreground">
                Download a complete backup of all Alice data (threads, memory, skills, tasks,
                settings, profile, providers). Useful for backup or migration.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([exportAllData()], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `alice-backup-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Data exported");
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export backup (JSON)
              </Button>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="font-medium">Import data</h3>
              <p className="text-xs text-destructive font-medium">
                Warning: This will replace all current data!
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a previously exported backup file. The import will overwrite threads, memory,
                skills, tasks, settings, profile, and providers.
              </p>
              <Input
                type="file"
                accept=".json"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const content = ev.target?.result as string;
                    const result = importAllData(content);
                    if (result.errors.length) {
                      toast.error("Import failed: " + result.errors.join(", "));
                    } else {
                      onSave(s, provs, prof);
                      toast.success(`Imported: ${result.imported.join(", ")}`);
                    }
                  };
                  reader.onerror = () => toast.error("Failed to read file");
                  reader.readAsText(file);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

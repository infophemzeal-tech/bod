"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Star, Plus, Trash2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToasts, ToastStack } from "@/components/toast";
import { LETTER_PLACEHOLDERS } from "@/lib/template";

type LetterTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
};

export function LetterTemplateEditor() {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { toasts, pushToast, dismissToast } = useToasts();

  async function load(selectAfterId?: string) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("letter_templates")
      .select("*")
      .order("created_at", { ascending: true });

    setLoading(false);

    if (error) {
      pushToast("error", `Failed to load templates: ${error.message}`);
      return;
    }

    const list = (data as LetterTemplate[]) ?? [];
    setTemplates(list);

    const nextSelected =
      selectAfterId ?? selectedId ?? list.find((t) => t.is_default)?.id ?? list[0]?.id ?? null;
    setSelectedId(nextSelected);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function updateSelected(patch: Partial<LetterTemplate>) {
    if (!selected) return;
    setTemplates((prev) => prev.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)));
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("letter_templates")
      .update({
        name: selected.name,
        subject: selected.subject,
        body: selected.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    setSaving(false);

    if (error) {
      pushToast("error", `Save failed: ${error.message}`);
      return;
    }

    pushToast("ok", "Template saved.");
  }

  async function handleSetDefault() {
    if (!selected) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("letter_templates")
      .update({ is_default: true })
      .eq("id", selected.id);

    if (error) {
      pushToast("error", `Failed: ${error.message}`);
      return;
    }

    pushToast("ok", `"${selected.name}" set as default.`);
    load(selected.id);
  }

  async function handleCreate() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("letter_templates")
      .insert({
        name: "New Template",
        subject: "Congratulations on Your Subscription",
        body:
          "The entire management of BOD Properties Limited, Real Estate Consultants wishes to congratulate you for being part of this great vision.\n\nWe acknowledge the receipt of your payment for {{plot_description}} in Our Estate, {{estate_name}}, {{estate_location}}.\n\nBased on your subscription and part payment find below the following details for your consumption:\n\n1. All further payments shall be made in Cheques or Paid into Our Accounts in favor of BOD Properties Nigeria Limited.\n2. The cost of the land is {{cost_of_land}} ({{cost_in_words}}) only.",
      })
      .select()
      .single();

    if (error) {
      pushToast("error", `Failed to create template: ${error.message}`);
      return;
    }

    pushToast("ok", "New template created.");
    load(data.id);
  }

  async function handleDelete() {
    if (!selected) return;
    if (templates.length <= 1) {
      pushToast("error", "You need at least one template.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("letter_templates").delete().eq("id", selected.id);

    if (error) {
      pushToast("error", `Delete failed: ${error.message}`);
      return;
    }

    pushToast("ok", "Template deleted.");
    setSelectedId(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading templates...
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="panel p-3">
        <button
          type="button"
          onClick={handleCreate}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-navy hover:text-navy"
        >
          <Plus className="h-3.5 w-3.5" />
          New Template
        </button>
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${
                t.id === selectedId ? "bg-navy text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="truncate">{t.name}</span>
              {t.is_default && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}
            </button>
          ))}
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            No templates yet — click &quot;New Template&quot; to create one.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field">Template Name</label>
                <input
                  className="field"
                  value={selected.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Subject Line</label>
                <input
                  className="field"
                  value={selected.subject}
                  onChange={(e) => updateSelected({ subject: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label-field">Letter Body</label>
              <textarea
                className="field min-h-64 font-mono text-sm"
                value={selected.body}
                onChange={(e) => updateSelected({ body: e.target.value })}
              />
            </div>

            <div className="flex items-start gap-2 rounded-md bg-navy-soft/40 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                Use these placeholders — they&apos;ll be swapped for the subscriber&apos;s real details:{" "}
                {LETTER_PLACEHOLDERS.map((p) => (
                  <code key={p.key} className="mx-0.5 rounded bg-surface px-1 py-0.5">
                    {`{{${p.key}}}`}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <div className="flex gap-2">
                {!selected.is_default && (
                  <button
                    type="button"
                    onClick={handleSetDefault}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-surface px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <Star className="h-4 w-4" />
                    Set as Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-navy-deep disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Template
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
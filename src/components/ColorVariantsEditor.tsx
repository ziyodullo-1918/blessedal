import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export function ColorVariantsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("#000000");

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (value.includes(v)) return;
    onChange([...value, v]);
    setDraft("#000000");
  }
  function remove(c: string) {
    onChange(value.filter((x) => x !== c));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(draft) ? draft : "#000000"}
          onChange={(e) => setDraft(e.target.value)}
          className="w-12 p-1 h-10 cursor-pointer shrink-0"
        />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#FF0000"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} className="shrink-0">
          <Plus className="size-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-1 pr-2 text-xs"
            >
              <span
                className="inline-block size-4 rounded-full border"
                style={{ backgroundColor: c }}
              />
              <span className="font-mono">{c}</span>
              <button
                type="button"
                onClick={() => remove(c)}
                className="ml-0.5 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

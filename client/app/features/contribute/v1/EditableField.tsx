import { ReactNode } from "react";
import { Edit, Loader2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditableTextFieldProps {
  title: string;
  value: string;
  isAdmin: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

export function EditableTextField({
  title,
  value,
  isAdmin,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  onChange,
  multiline = false,
  placeholder,
  className = "mb-4",
}: EditableTextFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider relative">
          <span className="text-primary">{">"}</span> {title}
        </h2>
        {isAdmin && !isEditing && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Edit className="w-3 h-3" />
          </button>
        )}
      </div>
      {isEditing && isAdmin ? (
        <div className="mt-2 flex flex-col gap-2">
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              placeholder={placeholder}
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
            />
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={isSaving} onClick={onSave}>
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <XCircle className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : multiline ? (
        <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed">
          {value || "(none)"}
        </pre>
      ) : (
        <p className="mt-2 text-sm text-foreground/90 font-mono">{value}</p>
      )}
    </div>
  );
}

interface EditableOptionsFieldProps<T extends string> {
  title: string;
  value: T;
  options: readonly T[];
  isAdmin: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onChange: (value: T) => void;
  renderDisplay: () => ReactNode;
  className?: string;
}

export function EditableOptionsField<T extends string>({
  title,
  value,
  options,
  isAdmin,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  onChange,
  renderDisplay,
  className = "mb-4",
}: EditableOptionsFieldProps<T>) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider relative">
          <span className="text-primary">{">"}</span> {title}
        </h2>
        {isAdmin && !isEditing && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Edit className="w-3 h-3" />
          </button>
        )}
      </div>
      {isEditing && isAdmin ? (
        <div className="mt-2 flex flex-col gap-2">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={`Select ${title}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={isSaving} onClick={onSave}>
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <XCircle className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        renderDisplay()
      )}
    </div>
  );
}

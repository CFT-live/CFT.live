import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import type { Feature, MutableFeatureStatus } from "../api/types";
import { EditableTextField, EditableOptionsField } from "../EditableField";
import { updateFeature } from "../api/api";

type FeatureDetailsCardProps = {
  readonly feature: Feature | null;
  readonly isAdmin: boolean;
  readonly onUpdate: () => Promise<void>;
  readonly onError: (error: string) => void;
  readonly onSuccess: (message: string) => void;
};

export function FeatureDetailsCard({
  feature,
  isAdmin,
  onUpdate,
  onError,
  onSuccess,
}: FeatureDetailsCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [editStatus, setEditStatus] = useState<MutableFeatureStatus>("OPEN");
  const [editingTokens, setEditingTokens] = useState(false);
  const [editTokens, setEditTokens] = useState("");
  const [editingDiscussion, setEditingDiscussion] = useState(false);
  const [editDiscussion, setEditDiscussion] = useState("");
  const [savingField, setSavingField] = useState(false);

  // Update edit state when feature loads
  useEffect(() => {
    if (feature) {
      setEditName(feature.name);
      setEditDescription(feature.description);
      setEditCategory(feature.category);
      setEditStatus(
        feature.status === "COMPLETED" ? "CANCELLED" : feature.status,
      );
      setEditTokens(String(feature.total_tokens_reward));
      setEditDiscussion(feature.discussions_url ?? "");
    }
  }, [feature]);

  if (!feature) {
    return (
      <Card className="p-4 border border-border/60 bg-card/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground relative">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading feature…
        </div>
      </Card>
    );
  }

  const isEditable = isAdmin && feature.status !== "COMPLETED";
  const statusBadge = getFeatureStatusBadge(feature.status);

  const handleUpdateField = async (
    updates: Partial<Omit<Feature, "status">> & {
      status?: MutableFeatureStatus;
    },
  ) => {
    setSavingField(true);
    try {
      await updateFeature({
        id: feature.id,
        name: updates.name ?? feature.name,
        description: updates.description ?? feature.description,
        category: updates.category ?? feature.category,
        total_tokens_reward:
          updates.total_tokens_reward ?? feature.total_tokens_reward,
        status:
          updates.status ??
          (feature.status === "COMPLETED" ? "CANCELLED" : feature.status),
        discussions_url: updates.discussions_url ?? feature.discussions_url,
      });
      await onUpdate();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSavingField(false);
    }
  };

  return (
    <Card className="p-4 border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-size-[100%_2px] opacity-10 pointer-events-none" />
      <div className="relative space-y-4">
        {/* Feature Name */}
        <EditableTextField
          title="Feature Name"
          value={editName}
          isEditable={isEditable}
          isEditing={editingName}
          isSaving={savingField}
          onEdit={() => {
            setEditName(feature.name);
            setEditingName(true);
          }}
          onCancel={() => setEditingName(false)}
          onChange={setEditName}
          onSave={async () => {
            await handleUpdateField({ name: editName.trim() });
            setEditingName(false);
            onSuccess("Feature name updated successfully!");
          }}
          placeholder="Feature name"
          className="mb-4"
        />

        {/* Feature Description */}
        <EditableTextField
          title="Description"
          value={editDescription}
          isEditable={isEditable}
          isEditing={editingDescription}
          isSaving={savingField}
          onEdit={() => {
            setEditDescription(feature.description);
            setEditingDescription(true);
          }}
          onCancel={() => setEditingDescription(false)}
          onChange={setEditDescription}
          onSave={async () => {
            await handleUpdateField({ description: editDescription.trim() });
            setEditingDescription(false);
            onSuccess("Feature description updated successfully!");
          }}
          multiline
          placeholder="Feature description"
          className="mb-4"
        />

        {/* Feature discussion */}
        <EditableTextField
          title="Discussion"
          value={editDiscussion}
          isEditable={isEditable}
          isEditing={editingDiscussion}
          isSaving={savingField}
          onEdit={() => {
            setEditDiscussion(feature.discussions_url ?? "");
            setEditingDiscussion(true);
          }}
          onCancel={() => setEditingDiscussion(false)}
          onChange={setEditDiscussion}
          onSave={async () => {
            await handleUpdateField({ discussions_url: editDiscussion.trim() });
            setEditingDiscussion(false);
            onSuccess("Feature discussion updated successfully!");
          }}
          multiline
          placeholder="Feature discussion"
          className="mb-4"
        />

        {/* Feature Category */}
        <EditableTextField
          title="Category"
          value={editCategory}
          isEditable={isEditable}
          isEditing={editingCategory}
          isSaving={savingField}
          onEdit={() => {
            setEditCategory(feature.category);
            setEditingCategory(true);
          }}
          onCancel={() => setEditingCategory(false)}
          onChange={setEditCategory}
          onSave={async () => {
            await handleUpdateField({ category: editCategory.trim() });
            setEditingCategory(false);
            onSuccess("Feature category updated successfully!");
          }}
          placeholder="Feature category"
          className="mb-4"
        />

        {/* Feature Status */}
        <EditableOptionsField
          title="Status"
          value={editStatus}
          options={["OPEN", "IN_PROGRESS", "CANCELLED"] as const}
          isEditable={isEditable}
          isEditing={editingStatus}
          isSaving={savingField}
          onEdit={() => {
            setEditStatus(
              feature.status === "COMPLETED" ? "CANCELLED" : feature.status,
            );
            setEditingStatus(true);
          }}
          onCancel={() => setEditingStatus(false)}
          onChange={setEditStatus}
          onSave={async () => {
            await handleUpdateField({ status: editStatus });
            setEditingStatus(false);
            onSuccess("Feature status updated successfully!");
          }}
          renderDisplay={() => (
            <div className="mt-2">
              <Badge variant={statusBadge.variant} className="gap-1">
                {statusBadge.icon}
                {feature.status}
              </Badge>
            </div>
          )}
          className="mb-4"
        />

        {/* Token Reward */}
        <EditableTextField
          title="Total Token Reward"
          value={editTokens}
          isEditable={isEditable}
          isEditing={editingTokens}
          isSaving={savingField}
          onEdit={() => {
            setEditTokens(String(feature.total_tokens_reward));
            setEditingTokens(true);
          }}
          onCancel={() => setEditingTokens(false)}
          onChange={setEditTokens}
          onSave={async () => {
            const tokenValue = Number(editTokens.trim());
            if (!Number.isFinite(tokenValue) || tokenValue < 0) {
              onError("Token reward must be a non-negative number");
              return;
            }
            await handleUpdateField({ total_tokens_reward: tokenValue });
            setEditingTokens(false);
            onSuccess("Token reward updated successfully!");
          }}
          placeholder="0"
          className=""
        />
      </div>
    </Card>
  );
}

function getFeatureStatusBadge(status: Feature["status"]): {
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
} {
  switch (status) {
    case "COMPLETED":
      return {
        variant: "default",
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case "IN_PROGRESS":
      return {
        variant: "secondary",
        icon: <Clock className="w-3 h-3" />,
      };
    case "CANCELLED":
      return {
        variant: "destructive",
        icon: <XCircle className="w-3 h-3" />,
      };
    default:
      return {
        variant: "outline",
        icon: null,
      };
  }
}

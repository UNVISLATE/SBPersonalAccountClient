import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import type { UserService } from "@/api/types";
import { formatDate } from "@/lib/format";
import {
  ClientSchemaNode,
  type ExtendedSchemaNode,
  type OrderManifest,
  type SchemaActionHandler,
} from "./SbuiOrderForm";

function readDotPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function interpolateString(raw: string, ctx: Record<string, unknown>): string {
  return raw.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, expr: string) => {
    const resolved = readDotPath(ctx, expr);
    if (resolved === undefined || resolved === null) return "";
    if (typeof resolved === "object") return JSON.stringify(resolved);
    return String(resolved);
  });
}

function interpolateNode(
  node: ExtendedSchemaNode,
  ctx: Record<string, unknown>
): ExtendedSchemaNode {
  const clone: Record<string, unknown> = { ...node };
  const templateKeys = [
    "content",
    "value",
    "url",
    "label",
    "header",
    "copy_value",
    "placeholder",
    "title",
    "description",
  ];
  for (const key of templateKeys) {
    if (typeof clone[key] === "string") {
      clone[key] = interpolateString(clone[key] as string, ctx);
    }
  }
  if (Array.isArray(clone.children)) {
    clone.children = (clone.children as ExtendedSchemaNode[]).map((child) =>
      interpolateNode(child, ctx)
    );
  }
  return clone as unknown as ExtendedSchemaNode;
}

export function extractServiceViewSchema(
  svc: UserService,
  catalogManifest?: OrderManifest | null
): {
  viewSchema: ExtendedSchemaNode | null;
  triggerLabel: string;
  hideKey: boolean;
} {
  const pub = (svc.public_data || {}) as Record<string, unknown>;
  const pubSchema = (pub.view_layout || pub.view_manifest || pub.view_form) as
    | ExtendedSchemaNode
    | undefined;
  const manifestSchema = (catalogManifest?.view_layout ||
    catalogManifest?.view_form ||
    catalogManifest?.service_view) as ExtendedSchemaNode | undefined;

  const viewSchema =
    pubSchema && typeof pubSchema === "object"
      ? pubSchema
      : manifestSchema && typeof manifestSchema === "object"
        ? manifestSchema
        : null;

  const triggerLabel =
    (typeof pub.view_trigger_label === "string" && pub.view_trigger_label) ||
    catalogManifest?.view_trigger_label ||
    "Открыть доступ";

  const hideKey = Boolean(pub.hide_key ?? catalogManifest?.hide_key);

  return { viewSchema, triggerLabel, hideKey };
}

function isSafeActionUrl(url?: string): boolean {
  if (!url) return false;
  return /^(https?:\/\/|v2raytun:\/\/|happ:\/\/|hiddify:\/\/|streisand:\/\/)/i.test(
    url.trim()
  );
}

export interface SbuiManifestViewProps {
  schema: ExtendedSchemaNode;
  service: UserService;
  serviceTitle: string;
  extractedKey?: string | null;
  instruction?: string | null;
  onOpenInstruction?: () => void;
}

export const SbuiManifestView: React.FC<SbuiManifestViewProps> = ({
  schema,
  service,
  serviceTitle,
  extractedKey,
  instruction,
  onOpenInstruction,
}) => {
  const [formState, setFormState] = useState<Record<string, unknown>>({});

  const templateContext = useMemo<Record<string, unknown>>(() => {
    const pub = (service.public_data || {}) as Record<string, unknown>;
    const cfg = (service.order_config || {}) as Record<string, unknown>;
    return {
      ...pub,
      public_data: pub,
      order_config: cfg,
      key: extractedKey ?? pub.key ?? "",
      instruction_md: instruction ?? pub.instruction_md ?? "",
      id: service.id,
      status: service.status,
      expires_at: service.expires_at ? formatDate(service.expires_at) : "Бессрочно",
      service: {
        id: service.service_id,
        name: serviceTitle,
      },
      order: {
        id: service.id,
        status: service.status,
        created_at: formatDate(service.created_at),
        expires_at: service.expires_at ? formatDate(service.expires_at) : "Бессрочно",
      },
    };
  }, [service, serviceTitle, extractedKey, instruction]);

  const resolvedSchema = useMemo(
    () => interpolateNode(schema, templateContext),
    [schema, templateContext]
  );

  const handleAction: SchemaActionHandler = async (action, payload) => {
    if (action === "copy") {
      const targetVal = payload?.copyValue || payload?.url || "";
      if (!targetVal) return;
      try {
        await navigator.clipboard.writeText(targetVal);
        toast.success("Скопировано в буфер обмена");
      } catch {
        toast.error("Не удалось скопировать");
      }
      return;
    }

    if (action === "link" && payload?.url) {
      if (isSafeActionUrl(payload.url)) {
        window.open(payload.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Недопустимая ссылка");
      }
      return;
    }

    if (action === "instruction" || action === "markdown" || action === "dialog_open") {
      onOpenInstruction?.();
    }
  };

  return (
    <div className="sbui-view-scope">
      <ClientSchemaNode
        node={resolvedSchema}
        formData={formState}
        onFormChange={(field, val) =>
          setFormState((prev) => ({ ...prev, [field]: val }))
        }
        onAction={handleAction}
      />
    </div>
  );
};

import React, { useState } from "react";
import { Select } from "@unvislate/sbui-sdk/components/form/Select";
import { DateTimePicker } from "@unvislate/sbui-sdk/components/datepicker/DateTimePicker";
import { QRCode } from "@unvislate/sbui-sdk/components/qr/QRCode";
import { Row, Column, Card } from "@unvislate/sbui-sdk/components/layout";
import { Text } from "@unvislate/sbui-sdk/components/typography";
import type { SchemaNode } from "@unvislate/sbui-sdk/types/schema";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { useCopy } from "@/hooks/use-copy";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import styles from "./SbuiOrderForm.module.scss";

export interface OrderFieldOption {
  value: string | number;
  label: string;
  price_delta?: number | string;
  description?: string;
}

export interface OrderFieldCondition {
  field: string;
  equals?: unknown;
  not_equals?: unknown;
  in?: unknown[];
}

export interface OrderFieldDef {
  id: string;
  type?: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  regex?: string;
  regex_error?: string;
  min_length?: number;
  max_length?: number;
  options?: OrderFieldOption[];
  depends_on?: OrderFieldCondition;
}

export interface CopyFieldNode {
  type: "copy_field" | "key" | "secret";
  id?: string;
  label?: string;
  value?: string;
  content?: string;
  secret?: boolean;
  className?: string;
  style?: Record<string, string | number>;
  depends_on?: OrderFieldCondition;
}

export interface MarkdownNode {
  type: "markdown";
  id?: string;
  content?: string;
  className?: string;
  style?: Record<string, string | number>;
  depends_on?: OrderFieldCondition;
}

export type ExtendedSchemaNode = SchemaNode | CopyFieldNode | MarkdownNode;

export interface OrderManifest {
  version?: string;
  name?: string;
  slug?: string;
  layout?: ExtendedSchemaNode;
  view_layout?: ExtendedSchemaNode;
  view_form?: ExtendedSchemaNode;
  service_view?: ExtendedSchemaNode;
  view_trigger_label?: string;
  hide_key?: boolean;
  client_order_form?: OrderFieldDef[];
}

export type SchemaActionHandler = (
  action: string,
  payload?: {
    url?: string;
    copyValue?: string;
    dialogId?: string;
    label?: string;
  }
) => void;

const CopyFieldWidget: React.FC<{
  id?: string;
  label?: string;
  value: string;
  secret?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ id, label, value, secret = false, className, style }) => {
  const { copy, copiedKey } = useCopy();
  const [revealed, setRevealed] = useState(!secret);
  const copyId = `sdui-copy-${id || label || value.slice(0, 16)}`;

  return (
    <div className={`${styles.copyFieldWrap} ${className || ""}`.trim()} style={style}>
      {label && <span className={styles.copyFieldLabel}>{label}</span>}
      <div className={styles.copyFieldBox}>
        <code className={styles.copyFieldValue}>
          {revealed ? value : "••••••••••••••••••••••••••••"}
        </code>
        <div className={styles.copyFieldActions}>
          {secret && (
            <button
              type="button"
              className={styles.copyFieldIconBtn}
              onClick={() => setRevealed((prev) => !prev)}
              title={revealed ? "Скрыть" : "Показать"}
              aria-label={revealed ? "Скрыть" : "Показать"}
            >
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
          <button
            type="button"
            className={styles.copyFieldCopyBtn}
            onClick={() => copy(value, copyId)}
          >
            {copiedKey === copyId ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedKey === copyId ? "Скопировано" : "Копировать"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export function isFieldVisible(
  cond: OrderFieldCondition | undefined,
  values: Record<string, unknown>
): boolean {
  if (!cond || !cond.field) return true;
  const parentVal = values[cond.field];
  if (cond.equals !== undefined && String(parentVal ?? "") !== String(cond.equals)) {
    return false;
  }
  if (cond.not_equals !== undefined && String(parentVal ?? "") === String(cond.not_equals)) {
    return false;
  }
  if (cond.in !== undefined && !cond.in.some((item) => String(item) === String(parentVal))) {
    return false;
  }
  return true;
}

export function extractOrderFormDefs(
  pricingConfig?: Record<string, unknown> | null
): OrderFieldDef[] {
  if (!pricingConfig) return [];
  const manifest = pricingConfig.manifest as OrderManifest | undefined;
  if (manifest && Array.isArray(manifest.client_order_form)) {
    return manifest.client_order_form;
  }
  const legacy = pricingConfig.form;
  if (Array.isArray(legacy)) {
    return (legacy as Array<Record<string, unknown>>)
      .map((f) => ({
        id: String(f.key || f.id || ""),
        type: typeof f.type === "string" ? f.type : "text",
        label: typeof f.label === "string" ? f.label : undefined,
        placeholder: typeof f.placeholder === "string" ? f.placeholder : undefined,
        description: typeof f.description === "string" ? f.description : undefined,
        required: Boolean(f.required),
        default: f.default,
        min: f.min as number | string | undefined,
        max: f.max as number | string | undefined,
        step: f.step as number | string | undefined,
        regex: typeof f.regex === "string" ? f.regex : undefined,
        regex_error: typeof f.regex_error === "string" ? f.regex_error : undefined,
        options: Array.isArray(f.options) ? (f.options as OrderFieldOption[]) : undefined,
        depends_on: f.depends_on as OrderFieldCondition | undefined,
      }))
      .filter((f) => Boolean(f.id));
  }
  return [];
}

export function getInitialOrderFormValues(
  pricingConfig?: Record<string, unknown> | null
): Record<string, unknown> {
  const fields = extractOrderFormDefs(pricingConfig);
  const initial: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.default !== undefined && f.default !== null) {
      initial[f.id] = f.default;
    } else if (f.type === "select" && f.options && f.options.length > 0) {
      initial[f.id] = String(f.options[0].value);
    } else if (f.type === "toggle" || f.type === "checkbox") {
      initial[f.id] = false;
    }
  }
  return initial;
}

export function validateOrderFormValues(
  pricingConfig: Record<string, unknown> | null | undefined,
  values: Record<string, unknown>
): Record<string, string> {
  const fields = extractOrderFormDefs(pricingConfig);
  const errors: Record<string, string> = {};

  for (const f of fields) {
    if (!isFieldVisible(f.depends_on, values)) continue;
    const raw = values[f.id];
    const strVal = raw === undefined || raw === null ? "" : String(raw).trim();

    if (f.required && !strVal) {
      errors[f.id] = `Заполните поле «${f.label || f.id}»`;
      continue;
    }

    if (strVal) {
      if (f.min_length !== undefined && strVal.length < f.min_length) {
        errors[f.id] = `Минимум ${f.min_length} символов`;
        continue;
      }
      if (f.max_length !== undefined && strVal.length > f.max_length) {
        errors[f.id] = `Максимум ${f.max_length} символов`;
        continue;
      }
      if (f.regex) {
        try {
          if (!new RegExp(f.regex).test(strVal)) {
            errors[f.id] = f.regex_error || "Неверный формат значения";
          }
        } catch {
          // ignore invalid regex from server
        }
      }
    }
  }

  return errors;
}

/**
 * External SchemaNode renderer wrapping @unvislate/sbui-sdk components and
 * overriding inputs, buttons, badges, and interactive view widgets.
 */
export const ClientSchemaNode: React.FC<{
  node: ExtendedSchemaNode;
  formData?: Record<string, unknown>;
  onFormChange?: (field: string, value: unknown) => void;
  onAction?: SchemaActionHandler;
  errors?: Record<string, string>;
}> = ({ node, formData = {}, onFormChange = () => {}, onAction, errors = {} }) => {
  if (!node || typeof node !== "object") return null;

  if (node.depends_on) {
    const parentVal = formData[node.depends_on.field];
    if (
      node.depends_on.equals !== undefined &&
      String(parentVal ?? "") !== String(node.depends_on.equals)
    ) {
      return null;
    }
    if (
      "not_equals" in node.depends_on &&
      node.depends_on.not_equals !== undefined &&
      String(parentVal ?? "") === String(node.depends_on.not_equals)
    ) {
      return null;
    }
    if (
      "in" in node.depends_on &&
      node.depends_on.in !== undefined &&
      !node.depends_on.in.some((item) => String(item) === String(parentVal))
    ) {
      return null;
    }
  }

  switch (node.type) {
    case "row":
      return (
        <Row
          gap={node.gap}
          align={node.align}
          justify={node.justify}
          wrap={node.wrap}
          className={node.className}
          style={node.style}
        >
          {(node.children || []).map((child, idx) => (
            <ClientSchemaNode
              key={child.id || idx}
              node={child}
              formData={formData}
              onFormChange={onFormChange}
              onAction={onAction}
              errors={errors}
            />
          ))}
        </Row>
      );

    case "column":
      return (
        <Column
          gap={node.gap}
          align={node.align}
          justify={node.justify}
          className={node.className}
          style={node.style}
        >
          {(node.children || []).map((child, idx) => (
            <ClientSchemaNode
              key={child.id || idx}
              node={child}
              formData={formData}
              onFormChange={onFormChange}
              onAction={onAction}
              errors={errors}
            />
          ))}
        </Column>
      );

    case "card":
      return (
        <Card
          header={node.header}
          padding={node.padding}
          variant={node.variant}
          className={node.className}
          style={node.style}
        >
          {(node.children || []).map((child, idx) => (
            <ClientSchemaNode
              key={child.id || idx}
              node={child}
              formData={formData}
              onFormChange={onFormChange}
              onAction={onAction}
              errors={errors}
            />
          ))}
        </Card>
      );

    case "grid": {
      const gridCols =
        typeof node.columns === "number"
          ? `repeat(${node.columns}, minmax(0, 1fr))`
          : node.columns || "repeat(2, minmax(0, 1fr))";
      const gapVal = typeof node.gap === "number" ? `${node.gap}px` : node.gap || "12px";
      return (
        <div
          className={`sbui-grid ${node.className || ""}`.trim()}
          style={{ display: "grid", gridTemplateColumns: gridCols, gap: gapVal, ...node.style }}
        >
          {(node.children || []).map((child, idx) => (
            <ClientSchemaNode
              key={child.id || idx}
              node={child}
              formData={formData}
              onFormChange={onFormChange}
              onAction={onAction}
              errors={errors}
            />
          ))}
        </div>
      );
    }

    case "divider":
      return (
        <div
          className={`sbui-divider ${node.orientation || "horizontal"} ${node.className || ""}`.trim()}
          style={node.style}
        />
      );

    case "space": {
      const sizeVal = typeof node.size === "number" ? `${node.size}px` : node.size || "16px";
      return <div style={{ height: sizeVal, width: sizeVal }} />;
    }

    case "text":
      return (
        <Text
          content={node.content}
          variant={node.variant}
          align={node.align}
          bold={node.bold}
          color={node.color}
          className={node.className}
          style={node.style}
        />
      );

    case "badge": {
      const badgeMap: Record<string, "accent" | "success" | "warning" | "danger" | "muted"> = {
        primary: "accent",
        success: "success",
        warning: "warning",
        danger: "danger",
        neutral: "muted",
      };
      return (
        <Badge
          variant={badgeMap[node.variant || "neutral"] || "default"}
          size={node.size}
          className={node.className}
          style={node.style}
        >
          {node.content}
        </Badge>
      );
    }

    case "alert":
      return (
        <div
          className={`sbui-alert sbui-alert-${node.variant || "info"} ${node.className || ""}`.trim()}
          style={{ padding: "12px 14px", fontSize: "13px", lineHeight: 1.45, ...node.style }}
        >
          {node.content || node.title}
        </div>
      );

    case "qr":
      return (
        <div className={styles.qrFrame}>
          <QRCode
            value={node.value}
            size={node.size}
            logo={node.logo}
            logoSize={node.logoSize}
            plateRadius={node.plateRadius}
            errorCorrection={node.errorCorrection}
            theme={(node as unknown as { theme?: "default" | "dark" | "light" | "brand" }).theme}
            color={node.color}
            backgroundColor={node.backgroundColor}
            className={node.className}
            style={node.style}
          />
        </div>
      );

    case "copy_field":
    case "key":
    case "secret":
      return (
        <CopyFieldWidget
          id={node.id}
          label={node.label}
          value={String(node.value ?? node.content ?? "")}
          secret={node.type === "secret" || Boolean(node.secret)}
          className={node.className}
          style={node.style}
        />
      );

    case "markdown":
      return node.content ? (
        <MarkdownContent content={node.content} className={node.className} />
      ) : null;

    case "datepicker":
      return (
        <DateTimePicker
          value={(formData[node.name] as string) || (node.defaultValue as string)}
          onChange={(val) => onFormChange(node.name, val)}
          label={node.label}
          mode={node.mode === "range" ? "date" : node.mode}
          minDate={node.minDate ? new Date(node.minDate) : undefined}
          maxDate={node.maxDate ? new Date(node.maxDate) : undefined}
          showPresets={node.showPresets}
          className={node.className}
          style={node.style}
        />
      );

    case "input":
    case "password":
      return (
        <Input
          label={node.label ? `${node.label}${node.required ? " *" : ""}` : undefined}
          type={node.type === "password" ? "password" : "text"}
          value={String(formData[node.name] ?? node.defaultValue ?? "")}
          placeholder={node.placeholder}
          hint={node.help}
          error={errors[node.name]}
          required={node.required}
          onChange={(e) => onFormChange(node.name, e.target.value)}
        />
      );

    case "number":
      return (
        <Input
          label={node.label ? `${node.label}${node.required ? " *" : ""}` : undefined}
          type="number"
          value={String(formData[node.name] ?? node.defaultValue ?? "")}
          min={node.min}
          max={node.max}
          step={node.step}
          placeholder={node.placeholder}
          hint={node.help}
          error={errors[node.name]}
          required={node.required}
          onChange={(e) =>
            onFormChange(node.name, e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      );

    case "select": {
      const opts = (node.options || []).map((o) => ({
        value: String(o.value),
        label: o.label,
        description: o.description,
      }));
      return (
        <Select
          options={opts}
          value={String(formData[node.name] ?? node.default ?? "")}
          onChange={(val) => onFormChange(node.name, val)}
          label={node.label}
          placeholder={node.placeholder}
          className={node.className}
          style={node.style}
        />
      );
    }

    case "toggle": {
      const isChecked = Boolean(formData[node.name] ?? node.default ?? false);
      return (
        <div
          className={`sbui-toggle-group ${node.className || ""}`.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            ...node.style,
          }}
        >
          <div>
            {node.label && (
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--sbui-fg)" }}>
                {node.label}
              </div>
            )}
            {node.help && (
              <div style={{ fontSize: "11px", color: "var(--sbui-fg-subtle)", marginTop: "2px" }}>
                {node.help}
              </div>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isChecked}
            onClick={() => onFormChange(node.name, !isChecked)}
            style={{
              width: "40px",
              height: "22px",
              borderRadius: "9999px",
              background: isChecked ? "var(--color-accent)" : "rgba(255, 255, 255, 0.14)",
              border: "none",
              position: "relative",
              cursor: "pointer",
              transition: "background 0.2s ease",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#ffffff",
                position: "absolute",
                top: "3px",
                left: isChecked ? "21px" : "3px",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>
      );
    }

    case "button": {
      const btnExtra = node as unknown as {
        value?: string;
        copy_value?: string;
      };
      return (
        <Button
          type="button"
          variant={node.variant === "primary" ? "gradient" : node.variant || "secondary"}
          size="md"
          className={node.className}
          style={node.style}
          onClick={() =>
            onAction?.(node.action || "submit", {
              url: node.url,
              copyValue: btnExtra.copy_value ?? btnExtra.value,
              dialogId: node.dialogId,
              label: node.label,
            })
          }
        >
          {node.label}
        </Button>
      );
    }

    default:
      return null;
  }
};

export interface SbuiOrderFormProps {
  pricingConfig?: Record<string, unknown> | null;
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
}

/**
 * External form adapter over @unvislate/sbui-sdk without altering submodule code.
 */
export const SbuiOrderForm: React.FC<SbuiOrderFormProps> = ({
  pricingConfig,
  values,
  onChange,
  errors = {},
}) => {
  const manifest = pricingConfig?.manifest as OrderManifest | undefined;
  const fields = extractOrderFormDefs(pricingConfig);

  const hasLayout = Boolean(manifest?.layout && typeof manifest.layout === "object");
  if (!hasLayout && fields.length === 0) return null;

  return (
    <div className="sbui-form-scope">
      {hasLayout && manifest?.layout && (
        <ClientSchemaNode
          node={manifest.layout}
          formData={values}
          onFormChange={onChange}
          errors={errors}
        />
      )}

      {fields.map((field) => {
        if (!isFieldVisible(field.depends_on, values)) return null;

        const fieldType = field.type || "text";
        const val = values[field.id] ?? field.default ?? "";
        const err = errors[field.id];
        const label = `${field.label || field.id}${field.required ? " *" : ""}`;

        if (fieldType === "textarea") {
          return (
            <div key={field.id} className={styles.textareaGroup}>
              <label className={styles.textareaLabel}>{label}</label>
              <textarea
                value={String(val)}
                placeholder={field.placeholder}
                required={field.required}
                rows={3}
                className={styles.textarea}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
              {err && <p className={styles.errorText}>{err}</p>}
              {!err && field.description && (
                <p className={styles.hintText}>{field.description}</p>
              )}
            </div>
          );
        }

        const node: SchemaNode =
          fieldType === "select"
            ? {
                type: "select",
                id: field.id,
                name: field.id,
                label,
                placeholder: field.placeholder,
                default: field.default as string | number | undefined,
                options: (field.options || []).map((o) => ({
                  value: o.value,
                  label: o.label,
                  description: o.description,
                })),
              }
            : fieldType === "toggle" || fieldType === "checkbox"
              ? {
                  type: "toggle",
                  id: field.id,
                  name: field.id,
                  label: field.label || field.id,
                  help: field.description,
                  default: Boolean(field.default),
                }
              : fieldType === "datetime"
                ? {
                    type: "datepicker",
                    id: field.id,
                    name: field.id,
                    label: field.label || field.id,
                    mode: "datetime",
                  }
                : fieldType === "number" || fieldType === "range"
                  ? {
                      type: "number",
                      id: field.id,
                      name: field.id,
                      label: field.label || field.id,
                      required: field.required,
                      min: field.min !== undefined ? Number(field.min) : undefined,
                      max: field.max !== undefined ? Number(field.max) : undefined,
                      step: field.step !== undefined ? Number(field.step) : undefined,
                      placeholder: field.placeholder,
                      help: field.description,
                      defaultValue:
                        field.default !== undefined ? Number(field.default) : undefined,
                    }
                  : {
                      type: fieldType === "password" ? "password" : "input",
                      id: field.id,
                      name: field.id,
                      label: field.label || field.id,
                      required: field.required,
                      placeholder: field.placeholder,
                      help: field.description,
                      defaultValue:
                        field.default !== undefined ? String(field.default) : undefined,
                    };

        return (
          <div key={field.id}>
            <ClientSchemaNode
              node={node}
              formData={values}
              onFormChange={onChange}
              errors={errors}
            />
            {fieldType === "select" && err && <p className={styles.errorText}>{err}</p>}
            {fieldType === "select" && !err && field.description && (
              <p className={styles.hintText}>{field.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

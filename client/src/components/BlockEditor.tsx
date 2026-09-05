import React from "react";
import { WysiwygEditor } from "./WysiwygEditor";

export interface BlockEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Re-exports the unified WYSIWYG Editor for backwards-compatibility across all content desks.
 */
export function BlockEditor({
  value,
  onChange,
  placeholder = "Start writing with rich text formatting (supports Markdown and WYSIWYG)...",
  minHeightClassName = "min-h-56",
  id,
  disabled = false,
}: BlockEditorProps) {
  return (
    <WysiwygEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeightClassName={minHeightClassName}
      id={id}
      disabled={disabled}
    />
  );
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link2,
  Unlink,
  Undo2,
  Redo2,
  RemoveFormatting,
  Eye,
  Code2,
  Sparkles,
  Paperclip,
  Check,
  X,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AiTextAssist, type AiTextTarget } from "@/components/AiTextAssist";
import { markdownToHtml, htmlToMarkdown } from "@shared/richTextEngine";

export interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  id?: string;
  disabled?: boolean;
  aiTarget?: AiTextTarget;
  aiContext?: string;
  className?: string;
  headerRightSlot?: React.ReactNode;
  onAttachClick?: () => void;
  isAttaching?: boolean;
}

interface ActiveStyles {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  code: boolean;
  codeBlock: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  link: boolean;
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = "Start writing with rich text formatting (supports Markdown and WYSIWYG)...",
  minHeightClassName = "min-h-48",
  id,
  disabled = false,
  aiTarget,
  aiContext,
  className = "",
  headerRightSlot,
  onAttachClick,
  isAttaching = false,
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [mode, setMode] = useState<"visual" | "markdown">("visual");

  // Active button states
  const [activeStyles, setActiveStyles] = useState<ActiveStyles>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    h1: false,
    h2: false,
    h3: false,
    link: false,
  });

  // Link Dialog State
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const savedSelectionRef = useRef<Range | null>(null);
  const activeAnchorRef = useRef<HTMLAnchorElement | null>(null);

  // Update active styles based on current cursor selection
  const updateActiveStyles = useCallback(() => {
    if (!editorRef.current || mode !== "visual") return;

    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }

      let inBlockquote = false;
      let inCodeBlock = false;
      let inCode = false;
      let inH1 = false;
      let inH2 = false;
      let inH3 = false;
      let inLink = false;

      let current = node as HTMLElement | null;
      while (current && current !== editorRef.current) {
        const tag = current.tagName?.toLowerCase();
        if (tag === "blockquote") inBlockquote = true;
        if (tag === "pre") inCodeBlock = true;
        if (tag === "code") inCode = true;
        if (tag === "h1") inH1 = true;
        if (tag === "h2") inH2 = true;
        if (tag === "h3") inH3 = true;
        if (tag === "a") inLink = true;
        current = current.parentElement;
      }

      setActiveStyles({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikeThrough"),
        bulletList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
        blockquote: inBlockquote,
        code: inCode && !inCodeBlock,
        codeBlock: inCodeBlock,
        h1: inH1,
        h2: inH2,
        h3: inH3,
        link: inLink,
      });
    } catch {
      // Ignore queryCommandState errors
    }
  }, [mode]);

  // Synchronize incoming value into editor HTML
  useEffect(() => {
    if (mode === "visual" && editorRef.current && !isInternalChange.current) {
      const html = markdownToHtml(value || "");
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
    isInternalChange.current = false;
  }, [value, mode]);

  // Listen to selection change for active button highlighting
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
        updateActiveStyles();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateActiveStyles]);

  // Content change handler from contentEditable
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    onChange(md);
    updateActiveStyles();
  }, [onChange, updateActiveStyles]);

  // Execute formatting command
  const execCmd = useCallback(
    (cmd: string, val?: string) => {
      if (disabled || mode !== "visual") return;
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      handleInput();
    },
    [disabled, mode, handleInput]
  );

  // Toggle Headings (H1, H2, H3, Paragraph)
  const toggleHeading = useCallback(
    (tag: "h1" | "h2" | "h3" | "p") => {
      if (disabled || mode !== "visual") return;
      editorRef.current?.focus();

      const selection = window.getSelection();
      const currentHeading = getClosestNode(selection, editorRef.current, tag);
      const isCurrentActive = Boolean(currentHeading);

      if (isCurrentActive || tag === "p") {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand("formatBlock", false, `<${tag}>`);
      }
      handleInput();
    },
    [disabled, mode, handleInput]
  );

  // Toggle Blockquote
  const toggleBlockquote = useCallback(() => {
    if (disabled || mode !== "visual") return;
    editorRef.current?.focus();
    if (activeStyles.blockquote) {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      document.execCommand("formatBlock", false, "<blockquote>");
    }
    handleInput();
  }, [disabled, mode, activeStyles.blockquote, handleInput]);

  // Toggle Inline Code
  const toggleInlineCode = useCallback(() => {
    if (disabled || mode !== "visual") return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const existingCode = getClosestNode(selection, editorRef.current, "code");

    if (existingCode) {
      const parent = existingCode.parentNode;
      if (parent) {
        while (existingCode.firstChild) {
          parent.insertBefore(existingCode.firstChild, existingCode);
        }
        parent.removeChild(existingCode);
      }
    } else {
      const selectedText = range.toString();
      const codeNode = document.createElement("code");
      if (selectedText) {
        try {
          range.surroundContents(codeNode);
        } catch {
          codeNode.textContent = selectedText;
          range.deleteContents();
          range.insertNode(codeNode);
        }
      } else {
        codeNode.textContent = "code";
        range.insertNode(codeNode);
      }
    }
    handleInput();
  }, [disabled, mode, handleInput]);

  // Toggle Code Block
  const toggleCodeBlock = useCallback(() => {
    if (disabled || mode !== "visual") return;
    editorRef.current?.focus();
    if (activeStyles.codeBlock) {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : "";
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = selectedText || "console.log('code block');";
      pre.appendChild(code);

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(pre);
      } else {
        editorRef.current?.appendChild(pre);
      }
    }
    handleInput();
  }, [disabled, mode, activeStyles.codeBlock, handleInput]);

  // Insert Task List Checklist
  const insertTaskList = useCallback(() => {
    if (disabled || mode !== "visual") return;
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || "Task item";

    const ul = document.createElement("ul");
    ul.className = "task-list";
    const li = document.createElement("li");
    li.setAttribute("data-task", "false");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.disabled = true;
    li.appendChild(checkbox);
    li.appendChild(document.createTextNode(` ${selectedText}`));
    ul.appendChild(li);

    range.deleteContents();
    range.insertNode(ul);
    handleInput();
  }, [disabled, mode, handleInput]);

  // Open Link Dialog
  const handleOpenLinkDialog = () => {
    if (disabled || mode !== "visual") return;
    activeAnchorRef.current = null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      const text = selection.toString();
      setLinkText(text);

      // Check if current node is inside a link
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName.toLowerCase() === "a") {
          activeAnchorRef.current = node as HTMLAnchorElement;
          setLinkUrl((node as HTMLAnchorElement).getAttribute("href") || "");
          setLinkText(node.textContent || text);
          break;
        }
        node = node.parentNode;
      }
    }
    setIsLinkDialogOpen(true);
  };

  // Apply Link from Dialog
  const handleApplyLink = () => {
    setIsLinkDialogOpen(false);
    if (!linkUrl.trim()) return;

    editorRef.current?.focus();
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
    }

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      url = `https://${url}`;
    }

    if (activeAnchorRef.current && editorRef.current?.contains(activeAnchorRef.current)) {
      const a = activeAnchorRef.current;
      a.href = url;
      a.target = "_blank";
      a.rel = "noreferrer";
      if (linkText.trim()) {
        a.textContent = linkText.trim();
      }
      activeAnchorRef.current = null;
    } else if (linkText.trim()) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = linkText.trim();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(a);
      }
    } else {
      document.execCommand("createLink", false, url);
      if (editorRef.current) {
        const anchors = editorRef.current.querySelectorAll("a");
        anchors.forEach(anchor => {
          if (!anchor.getAttribute("target")) {
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute("rel", "noreferrer");
          }
        });
      }
    }

    handleInput();
    setLinkUrl("");
    setLinkText("");
    savedSelectionRef.current = null;
    activeAnchorRef.current = null;
  };

  // Remove Link
  const handleRemoveLink = () => {
    document.execCommand("unlink");
    handleInput();
  };

  // Helper to find closest ancestor node with given tag name
  const getClosestNode = (selection: Selection | null, root: HTMLElement | null, tagName: string): HTMLElement | null => {
    if (!selection || !selection.anchorNode || !root) return null;
    let curr: Node | null = selection.anchorNode;
    while (curr && curr !== root) {
      if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).tagName.toLowerCase() === tagName.toLowerCase()) {
        return curr as HTMLElement;
      }
      curr = curr.parentNode;
    }
    return null;
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || mode !== "visual") return;

    // Handle Enter key for task lists and blockquotes
    if (e.key === "Enter" && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        // 1. Task list enter handling
        const taskLi = getClosestNode(selection, editorRef.current, "li");
        if (taskLi && taskLi.closest("ul.task-list")) {
          e.preventDefault();
          const taskUl = taskLi.closest("ul.task-list")!;
          const textWithoutCheckbox = taskLi.textContent?.trim() || "";
          if (!textWithoutCheckbox) {
            // Exit task list
            const p = document.createElement("p");
            p.appendChild(document.createElement("br"));
            taskLi.remove();
            if (taskUl.children.length === 0) {
              taskUl.parentNode?.insertBefore(p, taskUl);
              taskUl.remove();
            } else {
              taskUl.after(p);
            }
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            handleInput();
            return;
          } else {
            // Split content at cursor position
            const range = selection.getRangeAt(0);
            const splitRange = document.createRange();
            splitRange.setStart(range.endContainer, range.endOffset);
            splitRange.setEndAfter(taskLi.lastChild || taskLi);
            const extractedFragment = splitRange.extractContents();

            const newLi = document.createElement("li");
            newLi.setAttribute("data-task", "false");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.disabled = true;
            newLi.appendChild(checkbox);
            newLi.appendChild(document.createTextNode(" "));
            if (extractedFragment.childNodes.length > 0) {
              newLi.appendChild(extractedFragment);
            }

            taskLi.after(newLi);

            const newRange = document.createRange();
            const targetTextNode = newLi.childNodes[1] || newLi;
            newRange.setStart(targetTextNode, targetTextNode.nodeType === Node.TEXT_NODE ? 1 : 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            handleInput();
            return;
          }
        }

        // 2. Blockquote enter handling
        const bq = getClosestNode(selection, editorRef.current, "blockquote");
        if (bq) {
          const currentPara = getClosestNode(selection, bq, "p");
          const isParaEmpty = currentPara ? !currentPara.textContent?.trim() : false;
          const isBqEmpty = !bq.textContent?.trim();

          if (isParaEmpty || isBqEmpty) {
            e.preventDefault();
            const p = document.createElement("p");
            p.appendChild(document.createElement("br"));
            if (currentPara) {
              currentPara.remove();
            }
            if (!bq.textContent?.trim()) {
              bq.after(p);
              bq.remove();
            } else {
              bq.after(p);
            }
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            handleInput();
            return;
          }
        }
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        execCmd("bold");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        execCmd("italic");
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        execCmd("underline");
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        handleOpenLinkDialog();
      } else if (e.key === "z" || e.key === "Z") {
        if (e.shiftKey) {
          e.preventDefault();
          execCmd("redo");
        } else {
          e.preventDefault();
          execCmd("undo");
        }
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        execCmd("redo");
      }
    }
  };

  // Switch between Visual WYSIWYG and Markdown Source
  const handleToggleMode = (newMode: "visual" | "markdown") => {
    if (newMode === mode) return;

    if (newMode === "markdown" && editorRef.current) {
      // Serialize current DOM to markdown
      const md = htmlToMarkdown(editorRef.current.innerHTML);
      onChange(md);
    } else if (newMode === "visual" && editorRef.current) {
      // Re-render markdown to HTML
      const html = markdownToHtml(value || "");
      editorRef.current.innerHTML = html;
    }
    setMode(newMode);
  };

  // Formatting Toolbar Button Helper
  const renderToolButton = ({
    title,
    action,
    icon,
    isActive = false,
    disabled: btnDisabled = false,
  }: {
    title: string;
    action: () => void;
    icon: React.ReactNode;
    isActive?: boolean;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled || btnDisabled}
      onMouseDown={e => {
        // Prevent stealing focus from contenteditable
        e.preventDefault();
        action();
      }}
      className={`size-7 rounded-lg transition-all ${
        isActive
          ? "bg-primary/20 text-primary hover:bg-primary/30 font-bold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
      }`}
      title={title}
      aria-label={title}
    >
      {icon}
    </Button>
  );

  return (
    <div
      className={`signal-wysiwyg-shell group overflow-hidden rounded-2xl border border-input bg-card shadow-xs transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 ${
        disabled ? "opacity-60 pointer-events-none" : ""
      } ${className}`}
    >
      {/* WYSIWYG Header / Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/70 bg-secondary/30 px-3 py-1.5 rounded-t-2xl">
        <div className="flex flex-wrap items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Block Level: Headings */}
          <div className="flex items-center gap-0.5">
            {renderToolButton({
              title: "Heading 1 (#)",
              action: () => toggleHeading("h1"),
              icon: <Heading1 className="size-3.5" />,
              isActive: activeStyles.h1,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Heading 2 (##)",
              action: () => toggleHeading("h2"),
              icon: <Heading2 className="size-3.5" />,
              isActive: activeStyles.h2,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Heading 3 (###)",
              action: () => toggleHeading("h3"),
              icon: <Heading3 className="size-3.5" />,
              isActive: activeStyles.h3,
              disabled: mode !== "visual",
            })}
          </div>

          <span className="mx-1 h-4 w-px bg-border/80" aria-hidden />

          {/* Inline Styles */}
          <div className="flex items-center gap-0.5">
            {renderToolButton({
              title: "Bold (Ctrl+B)",
              action: () => execCmd("bold"),
              icon: <Bold className="size-3.5" />,
              isActive: activeStyles.bold,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Italic (Ctrl+I)",
              action: () => execCmd("italic"),
              icon: <Italic className="size-3.5" />,
              isActive: activeStyles.italic,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Underline (Ctrl+U)",
              action: () => execCmd("underline"),
              icon: <Underline className="size-3.5" />,
              isActive: activeStyles.underline,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Strikethrough (~~text~~)",
              action: () => execCmd("strikeThrough"),
              icon: <Strikethrough className="size-3.5" />,
              isActive: activeStyles.strikethrough,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Inline Code (`code`)",
              action: toggleInlineCode,
              icon: <Code className="size-3.5" />,
              isActive: activeStyles.code,
              disabled: mode !== "visual",
            })}
          </div>

          <span className="mx-1 h-4 w-px bg-border/80" aria-hidden />

          {/* Lists & Structures */}
          <div className="flex items-center gap-0.5">
            {renderToolButton({
              title: "Bulleted List (-)",
              action: () => execCmd("insertUnorderedList"),
              icon: <List className="size-3.5" />,
              isActive: activeStyles.bulletList,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Numbered List (1.)",
              action: () => execCmd("insertOrderedList"),
              icon: <ListOrdered className="size-3.5" />,
              isActive: activeStyles.orderedList,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Task Checklist (- [ ])",
              action: insertTaskList,
              icon: <CheckSquare className="size-3.5" />,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Blockquote (>)",
              action: toggleBlockquote,
              icon: <Quote className="size-3.5" />,
              isActive: activeStyles.blockquote,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Code Block (```)",
              action: toggleCodeBlock,
              icon: <FileCode className="size-3.5" />,
              isActive: activeStyles.codeBlock,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Divider (---)",
              action: () => execCmd("insertHorizontalRule"),
              icon: <Minus className="size-3.5" />,
              disabled: mode !== "visual",
            })}
          </div>

          <span className="mx-1 h-4 w-px bg-border/80" aria-hidden />

          {/* Links */}
          <div className="flex items-center gap-0.5">
            {renderToolButton({
              title: "Insert Link (Ctrl+K)",
              action: handleOpenLinkDialog,
              icon: <Link2 className="size-3.5" />,
              isActive: activeStyles.link,
              disabled: mode !== "visual",
            })}
            {activeStyles.link &&
              renderToolButton({
                title: "Remove Link",
                action: handleRemoveLink,
                icon: <Unlink className="size-3.5" />,
                disabled: mode !== "visual",
              })}
          </div>

          <span className="mx-1 h-4 w-px bg-border/80" aria-hidden />

          {/* Undo / Redo / Clear Formatting */}
          <div className="flex items-center gap-0.5">
            {renderToolButton({
              title: "Undo (Ctrl+Z)",
              action: () => execCmd("undo"),
              icon: <Undo2 className="size-3.5" />,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Redo (Ctrl+Y)",
              action: () => execCmd("redo"),
              icon: <Redo2 className="size-3.5" />,
              disabled: mode !== "visual",
            })}
            {renderToolButton({
              title: "Clear Formatting",
              action: () => execCmd("removeFormat"),
              icon: <RemoveFormatting className="size-3.5" />,
              disabled: mode !== "visual",
            })}
          </div>

          {/* Optional Attachment Trigger */}
          {onAttachClick && (
            <>
              <span className="mx-1 h-4 w-px bg-border/80" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAttachClick}
                disabled={disabled || isAttaching}
                className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 gap-1.5 shrink-0"
              >
                <Paperclip className="size-3.5" />
                <span>{isAttaching ? "Attaching..." : "Attach File"}</span>
              </Button>
            </>
          )}
        </div>

        {/* Right Toolbar: AI Assist & Visual/Markdown Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto py-0.5">
          {aiTarget && (
            <AiTextAssist
              value={value}
              onApply={improved => {
                onChange(improved);
                if (editorRef.current && mode === "visual") {
                  editorRef.current.innerHTML = markdownToHtml(improved);
                }
              }}
              target={aiTarget}
              context={aiContext}
            />
          )}

          {headerRightSlot}

          {/* Dual Mode Switcher (WYSIWYG vs Markdown) */}
          <div className="flex items-center rounded-lg bg-card p-0.5 border border-border shadow-2xs">
            <button
              type="button"
              onClick={() => handleToggleMode("visual")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                mode === "visual"
                  ? "bg-secondary text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visual WYSIWYG Editor"
            >
              <Eye className="size-3" /> Visual
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode("markdown")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                mode === "markdown"
                  ? "bg-secondary text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Raw Markdown Source"
            >
              <Code2 className="size-3" /> Markdown
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 sm:p-5">
        {mode === "visual" ? (
          <div
            ref={editorRef}
            id={id}
            contentEditable={!disabled}
            role="textbox"
            aria-multiline
            aria-placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveStyles}
            onMouseUp={updateActiveStyles}
            data-placeholder={placeholder}
            className={`${minHeightClassName} signal-wysiwyg-content whitespace-pre-wrap w-full bg-transparent font-sans text-sm sm:text-base leading-relaxed text-foreground outline-none empty:before:pointer-events-none empty:before:text-muted-foreground/60 empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:font-medium [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-secondary/20 [&_blockquote]:py-1.5 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 [&_code]:rounded-md [&_code]:bg-secondary/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground [&_pre]:rounded-xl [&_pre]:bg-secondary/70 [&_pre]:p-4 [&_pre]:my-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-foreground [&_h2]:mb-2.5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-foreground [&_hr]:my-4 [&_hr]:border-border/70 [&_li]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul.task-list]:list-none [&_ul.task-list>li]:ml-1 [&_ul.task-list>li]:flex [&_ul.task-list>li]:items-center [&_ul.task-list>li]:gap-2`}
          />
        ) : (
          <textarea
            id={id ? `${id}-markdown` : undefined}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`${minHeightClassName} w-full bg-transparent font-mono text-xs sm:text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-y`}
          />
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="size-5 text-primary" /> Insert or Edit Link
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="wysiwyg-link-url" className="text-xs font-bold uppercase tracking-wider">
                Destination URL *
              </Label>
              <Input
                id="wysiwyg-link-url"
                type="url"
                placeholder="https://example.com or /app/..."
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="wysiwyg-link-text" className="text-xs font-bold uppercase tracking-wider">
                Link Text (Optional)
              </Label>
              <Input
                id="wysiwyg-link-text"
                type="text"
                placeholder="Display text for this link"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            {activeStyles.link ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleRemoveLink();
                  setIsLinkDialogOpen(false);
                }}
                className="text-destructive hover:bg-destructive/10"
              >
                <Unlink className="mr-1.5 size-3.5" /> Remove Link
              </Button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyLink}
                disabled={!linkUrl.trim()}
              >
                <Check className="mr-1.5 size-3.5" /> Apply Link
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

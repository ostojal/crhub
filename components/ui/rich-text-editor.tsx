"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_INLINE_IMAGE_BYTES } from "@/lib/constants";
import { looksLikeHtml, sanitizeEmailHtml, textToHtml } from "@/lib/email/html";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BoldIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  RemoveFormattingIcon,
  UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef, type ClipboardEvent } from "react";
import { toast } from "sonner";

// Vrednosti koje prima execCommand("fontSize"); uz styleWithCSS daju
// <span style="font-size: …"> koji mejl klijenti razumeju
const FONT_SIZES = [
  { value: "2", label: "Mala" },
  { value: "3", label: "Normalna" },
  { value: "5", label: "Velika" },
  { value: "6", label: "Vrlo velika" },
];

const DEFAULT_FONT_SIZE = "3";

export function RichTextEditor({
  defaultValue,
  onChange,
  placeholder,
  minHeight = "12rem",
  ariaLabel,
}: {
  defaultValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  ariaLabel?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Nekontrolisano polje: sadržaj se upisuje jednom, inače bi kursor skakao
  // na svaki otkucani znak. Zamena sadržaja se radi preko `key` propa.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.innerHTML = defaultValue
      ? sanitizeEmailHtml(
          looksLikeHtml(defaultValue) ? defaultValue : textToHtml(defaultValue),
        )
      : "";

    // Formatiranje se upisuje kao inline style umesto zastarelih <font> tagova
    document.execCommand("styleWithCSS", false, "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const run = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const insertImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      toast.error(
        `Slika je prevelika (najviše ${formatBytes(MAX_INLINE_IMAGE_BYTES)}).`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      run(
        "insertHTML",
        `<img src="${reader.result}" style="max-width:100%;height:auto" alt="">`,
      );
    };
    reader.readAsDataURL(file);
  };

  // Nalepljeni sadržaj se propušta kroz sanitizaciju, a slike iz clipboard-a
  // se ubacuju kao data: URL (kasnije postaju cid: delovi mejla)
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) =>
      file.type.startsWith("image/"),
    );

    if (image) {
      event.preventDefault();
      insertImageFile(image);
      return;
    }

    const html = event.clipboardData.getData("text/html");
    if (html) {
      event.preventDefault();
      run("insertHTML", sanitizeEmailHtml(html));
    }
  };

  const handleLink = () => {
    const url = window.prompt("Adresa linka (URL):");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Link mora da počinje sa http:// ili https://");
      return;
    }
    run("createLink", url);
  };

  // Dugmad ne smeju da otmu fokus editoru, inače se gubi izbor teksta
  const keepFocus = (event: { preventDefault: () => void }) =>
    event.preventDefault();

  return (
    <div className="overflow-hidden rounded-2xl border border-transparent bg-input/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      <div className="flex flex-wrap items-center gap-1 border-b border-foreground/10 px-2 py-1.5">
        <ToolbarButton label="Podebljano" onClick={() => run("bold")}>
          <BoldIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Kurziv" onClick={() => run("italic")}>
          <ItalicIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Podvučeno" onClick={() => run("underline")}>
          <UnderlineIcon className="size-4" />
        </ToolbarButton>

        <Select
          defaultValue={DEFAULT_FONT_SIZE}
          onValueChange={(value) => run("fontSize", value)}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-32"
            aria-label="Veličina fonta"
            onMouseDown={keepFocus}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarButton label="Lista" onClick={() => run("insertUnorderedList")}>
          <ListIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numerisana lista"
          onClick={() => run("insertOrderedList")}
        >
          <ListOrderedIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={handleLink}>
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Slika" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Ukloni formatiranje"
          onClick={() => run("removeFormat")}
        >
          <RemoveFormattingIcon className="size-4" />
        </ToolbarButton>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) insertImageFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        style={{ minHeight }}
        className={cn(
          "w-full overflow-y-auto px-3 py-2 text-base outline-none md:text-sm",
          "[&_a]:text-primary [&_a]:underline [&_img]:max-w-full",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
          "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

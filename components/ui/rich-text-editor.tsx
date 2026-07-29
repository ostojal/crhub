"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchImageAsDataUrl } from "@/lib/actions/images";
import { MAX_INLINE_IMAGE_BYTES } from "@/lib/constants";
import {
  imageSources,
  isRemoteImageSource,
  looksLikeHtml,
  mapImageSources,
  sanitizeEmailHtml,
  textToHtml,
} from "@/lib/email/html";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BaselineIcon,
  BoldIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  RemoveFormattingIcon,
  UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent } from "react";
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

// Boje se upisuju kao hex u inline style — svaki mejl klijent ih razume
const FONT_COLORS = [
  { value: "#000000", label: "Crna" },
  { value: "#4b5563", label: "Siva" },
  { value: "#b91c1c", label: "Crvena" },
  { value: "#ea580c", label: "Narandžasta" },
  { value: "#ca8a04", label: "Žuta" },
  { value: "#15803d", label: "Zelena" },
  { value: "#0e7490", label: "Tirkizna" },
  { value: "#1d4ed8", label: "Plava" },
  { value: "#6d28d9", label: "Ljubičasta" },
  { value: "#be185d", label: "Roze" },
];

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
  // Izbor teksta se pamti jer ga otvaranje padajućeg menija (veličina, boja)
  // ruši — bez toga bi se komanda primenila na prazan izbor
  const selectionRef = useRef<Range | null>(null);
  const [colorOpen, setColorOpen] = useState(false);

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

  useEffect(() => {
    const remember = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        selectionRef.current = range.cloneRange();
      }
    };

    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, []);

  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = selectionRef.current;
    if (!editor || !range) return;
    if (!editor.contains(range.commonAncestorContainer)) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const emitChange = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const run = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
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
    if (!html) return;

    event.preventDefault();
    const clean = sanitizeEmailHtml(html);

    // Samo data: slike se prikazuju svuda. Ostalo iz tuđeg mejla (cid:,
    // blob:, relativne putanje) ostaje prekinuto, pa izlazi iz teksta.
    const keepEmbedded = (src: string) =>
      src.startsWith("data:") ? src : null;

    const remote = [
      ...new Set(imageSources(clean).filter(isRemoteImageSource)),
    ];
    if (remote.length === 0) {
      run("insertHTML", mapImageSources(clean, keepEmbedded));
      return;
    }

    // Slike iz Gmail potpisa ostaju na Google-ovom serveru i ovde se
    // prikazuju kao prekinute — povlače se preko servera i ugrađuju u tekst
    const pending = toast.loading(
      remote.length === 1 ? "Preuzimanje slike…" : "Preuzimanje slika…",
    );

    Promise.all(remote.map((src) => fetchImageAsDataUrl(src)))
      .then((results) => {
        const inlined = new Map(
          remote.map((src, index) => {
            const result = results[index];
            return [src, result.ok ? result.dataUrl : null];
          }),
        );

        // Slika koja se ne može povući izlazi iz teksta — prekinuta slika u
        // potpisu izgleda gore nego nijedna
        const failed = [...inlined.values()].filter(
          (value) => value === null,
        ).length;

        run(
          "insertHTML",
          mapImageSources(clean, (src) =>
            inlined.has(src) ? inlined.get(src)! : keepEmbedded(src),
          ),
        );

        if (failed === 0) return;

        toast.warning(
          failed === remote.length
            ? "Slike iz potpisa nisu mogle da se preuzmu jer su zaključane za Gmail nalog. Sačuvaj ih na računar i dodaj dugmetom za sliku."
            : `${failed} od ${remote.length} slika nije moglo da se preuzme. Dodaj ih dugmetom za sliku.`,
        );
      })
      .catch(() => {
        run("insertHTML", mapImageSources(clean, keepEmbedded));
        toast.error("Greška pri preuzimanju slika iz nalepljenog sadržaja.");
      })
      .finally(() => toast.dismiss(pending));
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

        <DropdownMenu open={colorOpen} onOpenChange={setColorOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="Boja slova"
              aria-label="Boja slova"
              onMouseDown={keepFocus}
            >
              <BaselineIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-max p-2">
            <div className="grid grid-cols-5 gap-1">
              {FONT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  aria-label={color.label}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    run("foreColor", color.value);
                    setColorOpen(false);
                  }}
                  className="size-6 rounded-full border border-foreground/20 transition-transform hover:scale-110"
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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

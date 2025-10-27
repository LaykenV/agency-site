"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface UrlChipsInputProps {
  value: string[];
  onChange: (urls: string[]) => void;
  placeholder?: string;
  className?: string;
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function UrlChipsInput({
  value,
  onChange,
  placeholder = "Enter URLs separated by commas or press Enter...",
  className,
}: UrlChipsInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const addUrls = (input: string) => {
    if (!input.trim()) return;

    const urls = input
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    urls.forEach((url) => {
      if (isValidUrl(url)) {
        if (!value.includes(url)) {
          validUrls.push(url);
        }
      } else {
        invalidUrls.push(url);
      }
    });

    if (invalidUrls.length > 0) {
      setError(`Invalid URL${invalidUrls.length > 1 ? "s" : ""}: ${invalidUrls.join(", ")}`);
      setTimeout(() => setError(null), 3000);
    } else {
      setError(null);
    }

    if (validUrls.length > 0) {
      onChange([...value, ...validUrls]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrls(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => {
    addUrls(inputValue);
  };

  const removeUrl = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex min-h-[42px] w-full flex-wrap gap-2 rounded-md border border-input bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] outline-none",
          error && "border-destructive ring-destructive/20 dark:ring-destructive/40"
        )}
      >
        {value.map((url) => (
          <span
            key={url}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-foreground"
          >
            <span className="max-w-[200px] truncate">{url}</span>
            <button
              type="button"
              onClick={() => removeUrl(url)}
              className="rounded-sm hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {url}</span>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}


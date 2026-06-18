"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

export interface QuickVariantSeed {
  size: string;
  color: string;
  colorHex?: string;
  stock: number;
}

interface VariantQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKeys: Set<string>;
  onApply: (variants: QuickVariantSeed[]) => void;
}

const HEX_REGEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/;

function parseSizes(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  );
}

interface ParsedColor {
  name: string;
  hex?: string;
}

function parseColors(input: string): ParsedColor[] {
  const seen = new Set<string>();
  const out: ParsedColor[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const token = raw.trim();
    if (!token) continue;
    const hexMatch = token.match(HEX_REGEX);
    const hex = hexMatch ? hexMatch[0] : undefined;
    const name = token.replace(HEX_REGEX, "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, hex });
  }
  return out;
}

export function VariantQuickAddDialog({
  open,
  onOpenChange,
  existingKeys,
  onApply,
}: VariantQuickAddDialogProps) {
  const [sizesInput, setSizesInput] = React.useState("");
  const [colorsInput, setColorsInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSizesInput("");
      setColorsInput("");
      setError(null);
    }
  }, [open]);

  const handleGenerate = () => {
    const sizes = parseSizes(sizesInput);
    const colors = parseColors(colorsInput);
    if (sizes.length === 0) {
      setError("Vui lòng nhập ít nhất 1 size.");
      return;
    }
    if (colors.length === 0) {
      setError("Vui lòng nhập ít nhất 1 màu.");
      return;
    }
    const variants: QuickVariantSeed[] = [];
    for (const size of sizes) {
      for (const color of colors) {
        const key = `${size.toLowerCase()}__${color.name.toLowerCase()}`;
        if (existingKeys.has(key)) continue;
        variants.push({
          size,
          color: color.name,
          colorHex: color.hex,
          stock: 0,
        });
      }
    }
    if (variants.length === 0) {
      setError("Tất cả tổ hợp đã tồn tại trong danh sách biến thể.");
      return;
    }
    onApply(variants);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo nhanh biến thể từ Size × Màu</DialogTitle>
          <DialogDescription>
            Nhập danh sách size và màu, mỗi mục cách nhau bằng dấu phẩy. Tổ hợp
            đã tồn tại sẽ được bỏ qua.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FormField
            label="Sizes"
            htmlFor="quick-sizes"
            hint='Ví dụ: "2T, 3T, 4T"'
          >
            <Textarea
              id="quick-sizes"
              rows={2}
              value={sizesInput}
              onChange={(e) => setSizesInput(e.target.value)}
              placeholder="2T, 3T, 4T"
            />
          </FormField>

          <FormField
            label="Màu sắc"
            htmlFor="quick-colors"
            hint='Có thể kèm mã hex. Ví dụ: "Trắng #FFFFFF, Xanh navy #1E3A5F"'
          >
            <Textarea
              id="quick-colors"
              rows={3}
              value={colorsInput}
              onChange={(e) => setColorsInput(e.target.value)}
              placeholder="Trắng #FFFFFF, Xanh navy #1E3A5F"
            />
          </FormField>

          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleGenerate}>Tạo biến thể</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

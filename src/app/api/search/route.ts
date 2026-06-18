import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface SearchRow {
  id: string;
  slug: string;
  name: string;
  basePrice: Prisma.Decimal | number;
  comparePrice: Prisma.Decimal | number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
}

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
}

interface CountRow {
  count: bigint;
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;
const MIN_QUERY_LENGTH = 2;

function toNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function normalizeRow(row: SearchRow): SearchResult {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    basePrice: toNumber(row.basePrice) ?? 0,
    comparePrice: toNumber(row.comparePrice),
    primaryImageUrl: row.primaryImageUrl,
    primaryImageAlt: row.primaryImageAlt,
  };
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") ?? "";
    const query = rawQuery.trim();
    const limit = parseLimit(searchParams.get("limit"));

    if (query.length < MIN_QUERY_LENGTH) {
      const featured = await prisma.$queryRaw<SearchRow[]>`
        SELECT p.id, p.slug, p.name, p."basePrice", p."comparePrice",
               (SELECT pi.url FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) as "primaryImageUrl",
               (SELECT pi.alt FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) as "primaryImageAlt"
        FROM "Product" p
        WHERE p.status = 'ACTIVE'
        ORDER BY p."createdAt" DESC
        LIMIT ${limit}
      `;

      return NextResponse.json(
        {
          results: featured.map(normalizeRow),
          totalEstimate: featured.length,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60",
          },
        },
      );
    }

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<SearchRow[]>`
        SELECT p.id, p.slug, p.name, p."basePrice", p."comparePrice",
               (SELECT pi.url FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) as "primaryImageUrl",
               (SELECT pi.alt FROM "ProductImage" pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) as "primaryImageAlt"
        FROM "Product" p
        WHERE p.status = 'ACTIVE'
          AND (
            p."searchVector" @@ plainto_tsquery('simple', unaccent(${query}))
            OR unaccent(p.name) ILIKE '%' || unaccent(${query}) || '%'
          )
        ORDER BY ts_rank(p."searchVector", plainto_tsquery('simple', unaccent(${query}))) DESC,
                 p."createdAt" DESC
        LIMIT ${limit}
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint as count
        FROM "Product" p
        WHERE p.status = 'ACTIVE'
          AND (
            p."searchVector" @@ plainto_tsquery('simple', unaccent(${query}))
            OR unaccent(p.name) ILIKE '%' || unaccent(${query}) || '%'
          )
      `,
    ]);

    const totalEstimate = countRows[0] ? Number(countRows[0].count) : 0;

    return NextResponse.json(
      {
        results: rows.map(normalizeRow),
        totalEstimate,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/search] Search failed:", message);
    return NextResponse.json(
      { error: "Không thể tìm kiếm sản phẩm. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}

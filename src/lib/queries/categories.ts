import 'server-only';
import { prisma } from '@/lib/prisma';

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
  children: CategoryTreeNode[];
};

export type CategoryFlat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
};

export type CategoryDetail = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
};

function sortNodes(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, 'vi');
    })
    .map((node) => ({ ...node, children: sortNodes(node.children) }));
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const rows = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      imageUrl: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });

  const byId = new Map<string, CategoryTreeNode>();
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      productCount: row._count.products,
      children: [],
    });
  }

  const roots: CategoryTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return sortNodes(roots);
}

export async function listCategoriesFlat(): Promise<CategoryFlat[]> {
  const tree = await getCategoryTree();
  const out: CategoryFlat[] = [];
  const walk = (nodes: CategoryTreeNode[], depth: number) => {
    for (const node of nodes) {
      out.push({
        id: node.id,
        name: node.name,
        slug: node.slug,
        parentId: node.parentId,
        depth,
      });
      if (node.children.length > 0) walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

export async function getCategoryById(
  id: string,
): Promise<CategoryDetail | null> {
  const row = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      imageUrl: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    productCount: row._count.products,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

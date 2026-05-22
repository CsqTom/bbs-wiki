export interface WikiTreeArticle {
  id: string;
  title: string;
  slug: string;
  directoryId: string | null;
}

export interface WikiTreeDirectory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  wikiArticles: WikiTreeArticle[];
}

export interface DirectoryNode extends WikiTreeDirectory {
  href: string;
  children: DirectoryNode[];
  articleLinks: Array<WikiTreeArticle & { href: string }>;
}

export function buildDirectoryTree(
  directories: WikiTreeDirectory[],
  parentId: string | null = null,
  parentSegments: string[] = [],
): DirectoryNode[] {
  return directories
    .filter((directory) => directory.parentId === parentId)
    .map((directory) => {
      const pathSegments = [...parentSegments, directory.slug];
      const href = `/wiki/${pathSegments.join("/")}`;

      return {
        ...directory,
        href,
        children: buildDirectoryTree(directories, directory.id, pathSegments),
        articleLinks: directory.wikiArticles.map((article) => ({
          ...article,
          href: `${href}/${article.slug}`,
        })),
      };
    });
}

export function flattenDirectoryOptions(
  nodes: DirectoryNode[],
  depth = 0,
): Array<{ id: string; label: string; href: string }> {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      label: `${"  ".repeat(depth)}${node.name}`,
      href: node.href,
    },
    ...flattenDirectoryOptions(node.children, depth + 1),
  ]);
}

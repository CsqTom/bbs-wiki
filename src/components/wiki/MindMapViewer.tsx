"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MindMapViewerProps {
  content: string;
  onSyncMarkdown?: (markdown: string) => void;
  readOnly?: boolean;
}

interface MarkmapInstance {
  setData: (data: unknown) => Promise<void>;
  fit: () => void;
  getData: (pure?: true) => unknown;
  destroy: () => void;
}

interface MarkmapPureNode {
  content?: string;
  children?: MarkmapPureNode[];
  payload?: {
    lines?: string;
  };
}

type SyncSegment =
  | {
      id: string;
      type: "heading";
      sourceStart: number;
      sourceEnd: number;
      subtreeEnd: number;
      displayContent: string;
      editableText: string;
      level: number;
    }
  | {
      id: string;
      type: "paragraph" | "block";
      sourceStart: number;
      sourceEnd: number;
      subtreeEnd: number;
      displayContent: string;
      editableText: string;
    }
  | {
      id: string;
      type: "code";
      sourceStart: number;
      sourceEnd: number;
      subtreeEnd: number;
      displayContent: string;
      editableText: string;
      language: string;
    };

interface SyncContext {
  sourceLines: string[];
  preparedMarkdown: string;
  segments: SyncSegment[];
  preparedLineToSegmentId: Map<number, string>;
}

interface CodeEditorState {
  segmentId: string;
  language: string;
  value: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PureNodeEntry {
  id: string;
  node: MarkmapPureNode;
  parentId: string | null;
  childIds: string[];
  order: number;
  segmentId: string | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeParagraphText(value: string) {
  return escapeHtml(
    value
      .replace(/\|/g, "¦")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Convert markdown images/links in paragraph text to img/a tags, sanitize the rest. */
function renderParagraphHtml(text: string) {
  const pattern = /(?:!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\))/g;
  let result = "";
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    result += sanitizeParagraphText(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      // Image: ![alt](url)
      const src = escapeHtml(match[2]);
      const alt = escapeHtml(match[1]);
      result += `<img src="${src}" alt="${alt}" style="max-width:100%;max-height:100px;cursor:pointer;display:block;border-radius:4px;margin:4px 0;" referrerPolicy="no-referrer" class="mm-image-node" />`;
    } else {
      // Link: [text](url "title")
      const linkText = escapeHtml(match[3]);
      const url = escapeHtml(match[4]);
      const title = match[5] ? escapeHtml(match[5]) : "";
      const titleAttr = title ? ` title="${title}"` : "";
      result += `<a href="${url}" target="_blank" rel="noopener noreferrer"${titleAttr} style="color:#2563eb;text-decoration:underline;cursor:pointer;" class="mm-link-node">${linkText}</a>`;
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex === 0) {
    return sanitizeParagraphText(text);
  }

  result += sanitizeParagraphText(text.slice(lastIndex));
  return result;
}

function formatCodeLine(value: string) {
  return escapeHtml(value)
    .replace(/\t/g, "    ")
    .replace(/ /g, "&nbsp;");
}

function isListLikeLine(value: string) {
  return /^([-*+]|\d+\.)\s+/.test(value);
}

function isBlockLikeLine(value: string) {
  return (
    isListLikeLine(value) ||
    value.startsWith(">") ||
    value.startsWith("|") ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(value)
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea";
}

function isCodeEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest("[data-mm-code='true']") !== null ||
    target.closest("[data-mm-code-editor='true']") !== null
  );
}

function buildCodeBlockNode(
  language: string,
  codeLines: string[],
  segmentId: string,
) {
  const languageLabel = language ? escapeHtml(language) : "";
  const blockLines =
    codeLines.length > 0 ? codeLines.map(formatCodeLine) : ["// empty"];
  const header = languageLabel
    ? `<span style="display:block;margin-bottom:6px;color:#93c5fd;font-size:11px;font-weight:600;">${languageLabel}</span>`
    : "";
  const codeBody = blockLines.join("<br>");

  return [
    `<div data-mm-code="true" data-mm-segment-id="${segmentId}" data-mm-code-lang="${languageLabel}" style="display:inline-block;max-width:720px;margin-top:4px;padding:10px 12px;border-radius:10px;background:#0f172a;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;box-shadow:inset 0 0 0 1px rgba(148,163,184,0.22);">`,
    header,
    `<div style="white-space:pre-wrap;">${codeBody}</div>`,
    "</div>",
  ].join("");
}

function decodeHtmlEntities(value: string) {
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function normalizeEditableText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlainTextFromNodeContent(value: string) {
  return normalizeEditableText(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function extractCodeTextFromNodeContent(value: string, language: string) {
  const normalizedHtml = value.replace(/<br\s*\/?>/gi, "\n");
  const lines = normalizedHtml
    .split("\n")
    .map((line) => decodeHtmlEntities(line.replace(/<[^>]+>/g, "")))
    .map((line) => line.replace(/\u00a0/g, " "));

  if (lines[0]?.trim() === language.trim()) {
    lines.shift();
  }

  while (lines.length > 0 && lines[0] === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

function getNodeStartLine(node: MarkmapPureNode) {
  const lineRange = node.payload?.lines;
  if (!lineRange) return null;
  const startLine = Number.parseInt(lineRange.split(",")[0] ?? "", 10);
  return Number.isNaN(startLine) ? null : startLine;
}

function buildPureNodeEntries(
  root: MarkmapPureNode,
  preparedLineToSegmentId: Map<number, string>,
) {
  const entries = new Map<string, PureNodeEntry>();
  let order = 0;
  let idCounter = 0;

  function visit(node: MarkmapPureNode, parentId: string | null) {
    idCounter += 1;
    const entryId = `node-${idCounter}`;
    const startLine = getNodeStartLine(node);
    const segmentId =
      startLine === null ? null : preparedLineToSegmentId.get(startLine) ?? null;
    const entry: PureNodeEntry = {
      id: entryId,
      node,
      parentId,
      childIds: [],
      order,
      segmentId,
    };
    order += 1;
    entries.set(entryId, entry);

    for (const child of node.children ?? []) {
      const childId = visit(child, entryId);
      entry.childIds.push(childId);
    }

    return entryId;
  }

  const rootId = visit(root, null);
  return { entries, rootId };
}

function findFirstMappedSegmentId(
  entryId: string,
  entries: Map<string, PureNodeEntry>,
): string | null {
  const entry = entries.get(entryId);
  if (!entry) return null;
  if (entry.segmentId) return entry.segmentId;

  for (const childId of entry.childIds) {
    const segmentId = findFirstMappedSegmentId(childId, entries);
    if (segmentId) return segmentId;
  }

  return null;
}

function findLastMappedSegmentId(
  entryId: string,
  entries: Map<string, PureNodeEntry>,
): string | null {
  const entry = entries.get(entryId);
  if (!entry) return null;

  for (let index = entry.childIds.length - 1; index >= 0; index -= 1) {
    const segmentId = findLastMappedSegmentId(entry.childIds[index], entries);
    if (segmentId) return segmentId;
  }

  return entry.segmentId;
}

function buildSyncContext(md: string): SyncContext {
  const sourceLines = md.split("\n");
  const preparedLines: string[] = [];
  const segments: SyncSegment[] = [];
  const preparedLineToSegmentId = new Map<number, string>();
  const paragraphBuffer: string[] = [];
  let paragraphStart = -1;
  let currentLevel = 1;
  let segmentIndex = 0;

  function nextId() {
    segmentIndex += 1;
    return `segment-${segmentIndex}`;
  }

  function pushPreparedLine(segmentId: string, line: string) {
    preparedLineToSegmentId.set(preparedLines.length, segmentId);
    preparedLines.push(line);
  }

  function flushParagraph(endIndex: number) {
    if (paragraphBuffer.length === 0 || paragraphStart < 0) return;
    const mergedParagraph = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
    const displayContent = renderParagraphHtml(mergedParagraph);
    const childLevel = Math.min(currentLevel + 1, 6);
    const prefix = "#".repeat(childLevel);
    const id = nextId();

    segments.push({
      id,
      type: "paragraph",
      sourceStart: paragraphStart,
      sourceEnd: endIndex,
      subtreeEnd: endIndex,
      displayContent,
      editableText: mergedParagraph,
    });
    pushPreparedLine(id, `${prefix} ${displayContent}`);

    paragraphBuffer.length = 0;
    paragraphStart = -1;
  }

  for (let i = 0; i < sourceLines.length; i++) {
    const line = sourceLines[i];
    const trimmedLine = line.trim();

    if (/^#{1,6}\s/.test(trimmedLine)) {
      flushParagraph(i - 1);
      const level = trimmedLine.match(/^(#{1,6})/)?.[1].length ?? 1;
      const headingText = trimmedLine.replace(/^#{1,6}\s+/, "").trim();
      const id = nextId();
      segments.push({
        id,
        type: "heading",
        sourceStart: i,
        sourceEnd: i,
        subtreeEnd: i,
        level,
        displayContent: headingText,
        editableText: headingText,
      });
      pushPreparedLine(id, trimmedLine);
      currentLevel = level;
      continue;
    }

    if (/^\s*$/.test(trimmedLine)) {
      flushParagraph(i - 1);
      continue;
    }

    if (trimmedLine.startsWith("```")) {
      flushParagraph(i - 1);
      const codeStart = i;
      const codeLines: string[] = [];
      const language = trimmedLine.slice(3).trim();
      i++;
      while (i < sourceLines.length && !sourceLines[i].trim().startsWith("```")) {
        codeLines.push(sourceLines[i]);
        i++;
      }
      const id = nextId();
      const childLevel = Math.min(currentLevel + 1, 6);
      const prefix = "#".repeat(childLevel);
      const displayContent = buildCodeBlockNode(language, codeLines, id);
      segments.push({
        id,
        type: "code",
        sourceStart: codeStart,
        sourceEnd: i,
        subtreeEnd: i,
        language,
        displayContent,
        editableText: codeLines.join("\n"),
      });
      pushPreparedLine(id, `${prefix} ${displayContent}`);
      continue;
    }

    if (isBlockLikeLine(trimmedLine)) {
      flushParagraph(i - 1);
      const id = nextId();
      const childLevel = Math.min(currentLevel + 1, 6);
      const prefix = "#".repeat(childLevel);
      const displayContent = sanitizeParagraphText(trimmedLine);
      segments.push({
        id,
        type: "block",
        sourceStart: i,
        sourceEnd: i,
        subtreeEnd: i,
        displayContent,
        editableText: trimmedLine,
      });
      pushPreparedLine(id, `${prefix} ${displayContent}`);
      continue;
    }

    if (paragraphStart < 0) {
      paragraphStart = i;
    }
    paragraphBuffer.push(trimmedLine);
  }

  flushParagraph(sourceLines.length - 1);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.type !== "heading") continue;

    let subtreeEnd = segment.sourceEnd;
    for (let nextIndex = index + 1; nextIndex < segments.length; nextIndex += 1) {
      const nextSegment = segments[nextIndex];
      if (
        nextSegment.type === "heading" &&
        nextSegment.level <= segment.level
      ) {
        break;
      }
      subtreeEnd = nextSegment.subtreeEnd;
    }
    segment.subtreeEnd = subtreeEnd;
  }

  return {
    sourceLines,
    preparedMarkdown: preparedLines.join("\n"),
    segments,
    preparedLineToSegmentId,
  };
}

function buildReplacementLines(segment: SyncSegment, nextContent: string) {
  if (segment.type === "heading") {
    return [`${"#".repeat(segment.level)} ${nextContent}`];
  }

  if (segment.type === "code") {
    return [
      `\`\`\`${segment.language}`.trimEnd(),
      ...nextContent.split("\n"),
      "```",
    ];
  }

  return [nextContent];
}

function buildInsertedHeadingLines(value: string, level: number | null) {
  if (!level) return [value];
  return [`${"#".repeat(Math.min(level + 1, 6))} ${value}`];
}

function findNearestHeadingLevel(
  entry: PureNodeEntry | null,
  entries: Map<string, PureNodeEntry>,
  segmentMap: Map<string, SyncSegment>,
): number | null {
  let currentEntry = entry;
  while (currentEntry) {
    if (currentEntry.segmentId) {
      const segment = segmentMap.get(currentEntry.segmentId);
      if (segment?.type === "heading") {
        return segment.level;
      }
    }
    currentEntry = currentEntry.parentId
      ? entries.get(currentEntry.parentId) ?? null
      : null;
  }
  return null;
}

export function MindMapViewer({
  content,
  onSyncMarkdown,
  readOnly = false,
}: MindMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const mmRef = useRef<MarkmapInstance | null>(null);
  const fitFrameRef = useRef<number | null>(null);
  const fitTimerRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const syncInteractionTimerRef = useRef<number | null>(null);
  const suppressAutoSyncRef = useRef(false);
  const lastSyncedMarkdownRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevFullscreenRef = useRef(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const cancelPendingFit = useCallback(() => {
    if (fitFrameRef.current !== null) {
      cancelAnimationFrame(fitFrameRef.current);
      fitFrameRef.current = null;
    }
    if (fitTimerRef.current !== null) {
      window.clearTimeout(fitTimerRef.current);
      fitTimerRef.current = null;
    }
  }, []);

  const scheduleFit = useCallback(() => {
    cancelPendingFit();

    fitFrameRef.current = requestAnimationFrame(() => {
      mmRef.current?.fit();
      fitFrameRef.current = null;
    });

    // markmap 在内容重绘和全屏切换后会有一次延迟布局，这里补一次滞后 fit。
    fitTimerRef.current = window.setTimeout(() => {
      mmRef.current?.fit();
      fitTimerRef.current = null;
    }, 120);
  }, [cancelPendingFit]);

  const syncSvgViewportSize = useCallback(() => {
    if (!viewportRef.current || !svgRef.current) return;

    const { width, height } = viewportRef.current.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;

    svgRef.current.style.display = "block";
    svgRef.current.style.width = `${width}px`;
    svgRef.current.style.height = `${height}px`;
  }, []);

  async function toggleFullscreen() {
    if (!containerRef.current) return;

    if (document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen();
      return;
    }

    await containerRef.current.requestFullscreen();
  }

  const syncContextRef = useRef<SyncContext | null>(null);
  const lastOpenedCodeEditorSegmentRef = useRef<string | null>(null);
  const [codeEditorState, setCodeEditorState] = useState<CodeEditorState | null>(
    null,
  );

  const applySegmentOperations = useCallback(
    (
      syncContext: SyncContext,
      operations: Array<{
        type: "replace" | "insert";
        sourceStart: number;
        sourceEnd: number;
        order: number;
        lines: string[];
      }>,
    ) => {
      const nextLines = [...syncContext.sourceLines];
      operations
        .sort((left, right) => {
          if (right.sourceStart !== left.sourceStart) {
            return right.sourceStart - left.sourceStart;
          }
          return right.order - left.order;
        })
        .forEach((operation) => {
          const deleteCount =
            operation.type === "replace"
              ? operation.sourceEnd - operation.sourceStart + 1
              : 0;
          nextLines.splice(operation.sourceStart, deleteCount, ...operation.lines);
        });

      return nextLines.join("\n");
    },
    [],
  );

  const applyCodeEditorChanges = useCallback(() => {
    if (!codeEditorState || !onSyncMarkdown) return;

    const syncContext = syncContextRef.current;
    if (!syncContext) {
      setCodeEditorState(null);
      return;
    }

    const segment = syncContext.segments.find(
      (item) => item.id === codeEditorState.segmentId && item.type === "code",
    );
    if (!segment || segment.type !== "code") {
      setCodeEditorState(null);
      return;
    }

    if (codeEditorState.value === segment.editableText) {
      setCodeEditorState(null);
      return;
    }

    const nextMarkdown = applySegmentOperations(syncContext, [
      {
        type: "replace",
        sourceStart: segment.sourceStart,
        sourceEnd: segment.sourceEnd,
        order: segment.sourceStart,
        lines: buildReplacementLines(segment, codeEditorState.value),
      },
    ]);

    lastSyncedMarkdownRef.current = nextMarkdown;
    onSyncMarkdown(nextMarkdown);
    setCodeEditorState(null);
  }, [applySegmentOperations, codeEditorState, onSyncMarkdown]);

  const syncCurrentMindMapToMarkdown = useCallback(async (force = false) => {
    if (!mmRef.current || !onSyncMarkdown || suppressAutoSyncRef.current) return;
    const pureNode = mmRef.current.getData(true) as MarkmapPureNode | undefined;
    const syncContext = syncContextRef.current;
    if (!pureNode || !syncContext) return;
    const segmentMap = new Map(
      syncContext.segments.map((segment) => [segment.id, segment]),
    );
    const { entries, rootId } = buildPureNodeEntries(
      pureNode,
      syncContext.preparedLineToSegmentId,
    );

    const currentContentBySegmentId = new Map<string, string>();
    entries.forEach((entry) => {
      if (!entry.segmentId || typeof entry.node.content !== "string") return;
      currentContentBySegmentId.set(entry.segmentId, entry.node.content);
    });

    if (currentContentBySegmentId.size !== syncContext.segments.length) {
      const { toMarkdown } = await import("markmap-plus");
      const markdown = toMarkdown(pureNode as Parameters<typeof toMarkdown>[0]);
      if (!force && markdown === lastSyncedMarkdownRef.current) return;
      lastSyncedMarkdownRef.current = markdown;
      onSyncMarkdown(markdown);
      return;
    }

    const changedSegments = syncContext.segments
      .map((segment) => {
        const currentNodeContent = currentContentBySegmentId.get(segment.id);
        if (typeof currentNodeContent !== "string") return null;

        const nextText =
          segment.type === "code"
            ? extractCodeTextFromNodeContent(currentNodeContent, segment.language)
            : extractPlainTextFromNodeContent(currentNodeContent);

        if (nextText === segment.editableText) return null;

        return {
          segment,
          replacementLines: buildReplacementLines(segment, nextText),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const insertedSegments = Array.from(entries.values())
      .filter((entry) => !entry.segmentId && typeof entry.node.content === "string")
      .map((entry) => {
        const nextText = extractPlainTextFromNodeContent(entry.node.content ?? "");
        if (!nextText) return null;

        const parentEntry = entry.parentId
          ? (entries.get(entry.parentId) ?? null)
          : null;
        const siblings = parentEntry
          ? parentEntry.childIds
          : rootId === entry.id
            ? []
            : [rootId];
        const siblingIndex = siblings.indexOf(entry.id);
        let insertAt = syncContext.sourceLines.length;

        for (let index = siblingIndex - 1; index >= 0; index -= 1) {
          const previousSegmentId = findLastMappedSegmentId(siblings[index], entries);
          if (!previousSegmentId) continue;
          const previousSegment = segmentMap.get(previousSegmentId);
          if (!previousSegment) continue;
          insertAt = previousSegment.subtreeEnd + 1;
          return {
            order: entry.order,
            insertAt,
            insertedLines: buildInsertedHeadingLines(
              nextText,
              findNearestHeadingLevel(parentEntry, entries, segmentMap),
            ),
          };
        }

        for (let index = siblingIndex + 1; index < siblings.length; index += 1) {
          const nextSegmentId = findFirstMappedSegmentId(siblings[index], entries);
          if (!nextSegmentId) continue;
          const nextSegment = segmentMap.get(nextSegmentId);
          if (!nextSegment) continue;
          insertAt = nextSegment.sourceStart;
          return {
            order: entry.order,
            insertAt,
            insertedLines: buildInsertedHeadingLines(
              nextText,
              findNearestHeadingLevel(parentEntry, entries, segmentMap),
            ),
          };
        }

        let ancestorEntry = parentEntry;
        while (ancestorEntry) {
          if (ancestorEntry.segmentId) {
            const ancestorSegment = segmentMap.get(ancestorEntry.segmentId);
            if (ancestorSegment) {
              insertAt =
                ancestorSegment.type === "heading"
                  ? ancestorSegment.sourceEnd + 1
                  : ancestorSegment.subtreeEnd + 1;
              break;
            }
          }
          ancestorEntry = ancestorEntry.parentId
            ? entries.get(ancestorEntry.parentId) ?? null
            : null;
        }

        return {
          order: entry.order,
          insertAt,
          insertedLines: buildInsertedHeadingLines(
            nextText,
            findNearestHeadingLevel(parentEntry, entries, segmentMap),
          ),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (changedSegments.length === 0 && insertedSegments.length === 0) return;

    const operations = [
      ...changedSegments.map(({ segment, replacementLines }) => ({
        type: "replace" as const,
        sourceStart: segment.sourceStart,
        sourceEnd: segment.sourceEnd,
        order: segment.sourceStart,
        lines: replacementLines,
      })),
      ...insertedSegments.map(({ insertAt, insertedLines, order }) => ({
        type: "insert" as const,
        sourceStart: insertAt,
        sourceEnd: insertAt - 1,
        order,
        lines: insertedLines,
      })),
    ];

    const nextMarkdown = applySegmentOperations(syncContext, operations);
    if (!force && nextMarkdown === lastSyncedMarkdownRef.current) return;

    lastSyncedMarkdownRef.current = nextMarkdown;
    onSyncMarkdown(nextMarkdown);
  }, [applySegmentOperations, onSyncMarkdown]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const { Markmap, Transformer } = await import("markmap-plus");

      if (cancelled || !svgRef.current) return;

      lastSyncedMarkdownRef.current = content;
      syncSvgViewportSize();
      const transformer = new Transformer();
      const syncContext = buildSyncContext(content);
      syncContextRef.current = syncContext;
      const prepared = syncContext.preparedMarkdown;
      const { root } = transformer.transform(prepared);
      suppressAutoSyncRef.current = true;

      if (!mmRef.current) {
        mmRef.current = Markmap.create(
          svgRef.current,
          {
            mode: "editable",
            editable: !readOnly,
            addable: !readOnly,
            deletable: !readOnly,
            hoverBorder: !readOnly,
            clickBorder: !readOnly,
            duration: 300,
            initialExpandLevel: -1,
            zoom: true,
            pan: true,
          },
        ) as unknown as MarkmapInstance;
      }

      await mmRef.current.setData(root);

      if (!isFullscreen) {
        scheduleFit();
      } else {
        cancelPendingFit();
      }
      window.setTimeout(() => {
        suppressAutoSyncRef.current = false;
      }, 180);
    }

    void render();

    return () => {
      cancelled = true;
      cancelPendingFit();
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (syncInteractionTimerRef.current !== null) {
        window.clearTimeout(syncInteractionTimerRef.current);
        syncInteractionTimerRef.current = null;
      }
      if (mmRef.current) {
        mmRef.current.destroy();
        mmRef.current = null;
      }
    };
  }, [
    content,
    cancelPendingFit,
    isFullscreen,
    readOnly,
    scheduleFit,
    syncSvgViewportSize,
  ]);

  useEffect(() => {
    if (!viewportRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      syncSvgViewportSize();
      if (isFullscreen) return;
      scheduleFit();
    });

    observer.observe(viewportRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isFullscreen, scheduleFit, syncSvgViewportSize]);

  useEffect(() => {
    if (!containerRef.current || !onSyncMarkdown || readOnly) return;

    function scheduleMarkdownSyncFromCommit() {
      if (suppressAutoSyncRef.current) return;
      if (syncInteractionTimerRef.current !== null) {
        window.clearTimeout(syncInteractionTimerRef.current);
      }
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }

      // 仅在编辑提交后回写，避免用户输入中的中间态打断编辑体验。
      syncInteractionTimerRef.current = window.setTimeout(() => {
        syncInteractionTimerRef.current = null;
        syncTimerRef.current = window.setTimeout(() => {
          syncTimerRef.current = null;
          void syncCurrentMindMapToMarkdown();
        }, 80);
      }, 0);
    }

    function handleKeydown(event: Event) {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== "Enter" || keyboardEvent.isComposing) return;
      if (!isEditableTarget(keyboardEvent.target)) return;
      if (isCodeEditableTarget(keyboardEvent.target)) return;
      scheduleMarkdownSyncFromCommit();
    }

    function handleFocusOut(event: Event) {
      if (!isEditableTarget(event.target)) return;
      if (isCodeEditableTarget(event.target)) return;
      scheduleMarkdownSyncFromCommit();
    }

    const rootElement = containerRef.current;
    rootElement.addEventListener("keydown", handleKeydown, true);
    rootElement.addEventListener("focusout", handleFocusOut, true);

    return () => {
      rootElement.removeEventListener("keydown", handleKeydown, true);
      rootElement.removeEventListener("focusout", handleFocusOut, true);
    };
  }, [onSyncMarkdown, readOnly, syncCurrentMindMapToMarkdown]);

  useEffect(() => {
    if (!containerRef.current || readOnly) return;

    function handleCodeNodeDoubleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const codeElement = target.closest("[data-mm-code='true']");
      if (!(codeElement instanceof HTMLElement) || !containerRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const segmentId = codeElement.dataset.mmSegmentId;
      if (!segmentId) return;

      const syncContext = syncContextRef.current;
      const segment = syncContext?.segments.find(
        (item) => item.id === segmentId && item.type === "code",
      );
      if (!segment || segment.type !== "code") return;

      const containerBounds = containerRef.current.getBoundingClientRect();
      const codeBounds = codeElement.getBoundingClientRect();
      const overlayWidth = Math.min(
        Math.max(codeBounds.width, 420),
        containerBounds.width - 32,
      );
      const overlayHeight = Math.min(
        Math.max(codeBounds.height + 120, 220),
        containerBounds.height - 32,
      );
      const left = Math.min(
        Math.max(codeBounds.left - containerBounds.left, 16),
        Math.max(containerBounds.width - overlayWidth - 16, 16),
      );
      const top = Math.min(
        Math.max(codeBounds.top - containerBounds.top, 16),
        Math.max(containerBounds.height - overlayHeight - 16, 16),
      );

      setCodeEditorState({
        segmentId,
        language: segment.language,
        value: segment.editableText,
        top,
        left,
        width: overlayWidth,
        height: overlayHeight,
      });
    }

    const rootElement = containerRef.current;
    rootElement.addEventListener("dblclick", handleCodeNodeDoubleClick, true);

    return () => {
      rootElement.removeEventListener("dblclick", handleCodeNodeDoubleClick, true);
    };
  }, [readOnly]);

  useEffect(() => {
    if (!containerRef.current) return;

    function handleImageDoubleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const imgElement = target.closest(".mm-image-node");
      if (!(imgElement instanceof HTMLImageElement)) return;

      event.preventDefault();
      event.stopPropagation();
      setLightboxUrl(imgElement.src);
    }

    function handleLinkClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const linkElement = target.closest(".mm-link-node");
      if (!(linkElement instanceof HTMLAnchorElement)) return;

      event.preventDefault();
      event.stopPropagation();
      window.open(linkElement.href, "_blank", "noopener,noreferrer");
    }

    const rootElement = containerRef.current;
    rootElement.addEventListener("dblclick", handleImageDoubleClick, true);
    rootElement.addEventListener("click", handleLinkClick, true);

    return () => {
      rootElement.removeEventListener("dblclick", handleImageDoubleClick, true);
      rootElement.removeEventListener("click", handleLinkClick, true);
    };
  }, []);

  useEffect(() => {
    if (!codeEditorState || !codeEditorRef.current) return;

    if (lastOpenedCodeEditorSegmentRef.current === codeEditorState.segmentId) {
      return;
    }

    lastOpenedCodeEditorSegmentRef.current = codeEditorState.segmentId;
    codeEditorRef.current.focus();
    codeEditorRef.current.setSelectionRange(
      codeEditorState.value.length,
      codeEditorState.value.length,
    );
  }, [codeEditorState]);

  useEffect(() => {
    if (codeEditorState) return;
    lastOpenedCodeEditorSegmentRef.current = null;
  }, [codeEditorState]);

  useEffect(() => {
    if (!codeEditorState) return;

    function handleGlobalKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCodeEditorState(null);
        return;
      }

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyCodeEditorChanges();
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeydown);
    };
  }, [applyCodeEditorChanges, codeEditorState]);

  useEffect(() => {
    if (!svgRef.current) return;

    function handleManualViewportInteraction() {
      // 用户开始手动拖拽或缩放后，取消尚未执行的自动 fit，避免把视图再次缩回去。
      cancelPendingFit();
    }

    const svgElement = svgRef.current;
    svgElement.addEventListener("wheel", handleManualViewportInteraction, {
      passive: true,
    });
    svgElement.addEventListener("pointerdown", handleManualViewportInteraction);

    return () => {
      svgElement.removeEventListener("wheel", handleManualViewportInteraction);
      svgElement.removeEventListener("pointerdown", handleManualViewportInteraction);
    };
  }, [cancelPendingFit]);

  useEffect(() => {
    function handleFullscreenChange() {
      const nextFullscreen = document.fullscreenElement === containerRef.current;
      setIsFullscreen(nextFullscreen);
    }

    function handleWindowResize() {
      syncSvgViewportSize();
      if (document.fullscreenElement === containerRef.current) return;
      scheduleFit();
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleWindowResize);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [scheduleFit, syncSvgViewportSize]);

  useEffect(() => {
    if (prevFullscreenRef.current === isFullscreen) return;

    prevFullscreenRef.current = isFullscreen;

    // 仅在进入或退出全屏时适配一次，彻底去掉全屏编辑过程中的自动缩放机制。
    syncSvgViewportSize();
    scheduleFit();
  }, [isFullscreen, scheduleFit, syncSvgViewportSize]);

  return (
    <div
      ref={containerRef}
      className={`relative flex w-full min-h-0 flex-1 flex-col overflow-hidden bg-white ${
        isFullscreen
          ? "h-screen min-h-screen rounded-none bg-slate-950 p-3 shadow-none"
          : "h-full rounded-none shadow-none"
      }`}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex gap-2 justify-end">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="pointer-events-auto rounded-lg border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
        >
          {isFullscreen ? "退出全屏" : "全屏"}
        </button>
      </div>
      <div
        ref={viewportRef}
        className={`min-h-0 flex-1 ${
          isFullscreen ? "rounded-xl bg-white" : ""
        }`}
      >
        <svg ref={svgRef} className="block h-full w-full min-h-0 flex-1" />
      </div>
      {!readOnly && codeEditorState && (
        <div
          data-mm-code-editor="true"
          className="absolute z-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
          style={{
            top: codeEditorState.top,
            left: codeEditorState.left,
            width: codeEditorState.width,
            height: codeEditorState.height,
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <span>代码块编辑 · {codeEditorState.language || "text"}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCodeEditorState(null)}
                className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={applyCodeEditorChanges}
                className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
          <textarea
            ref={codeEditorRef}
            data-mm-code-editor="true"
            value={codeEditorState.value}
            onChange={(event) =>
              setCodeEditorState((current) =>
                current
                  ? {
                      ...current,
                      value: event.target.value,
                    }
                  : current,
              )
            }
            wrap="off"
            spellCheck={false}
            className="h-[calc(100%-41px)] w-full resize-none overflow-auto whitespace-pre border-0 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 focus:outline-none"
          />
        </div>
      )}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={lightboxUrl}
              alt=""
              className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-md hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

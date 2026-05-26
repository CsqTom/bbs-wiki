"use client";

import { useState } from "react";
import { AIDialog } from "./AIDialog";
import { ContentSheet } from "./ContentSheet";

export function NavbarAIButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetSource, setSheetSource] = useState<{
    id: string;
    title: string;
    type: "wiki" | "post";
  } | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        AI 问答
      </button>

      <AIDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onOpenSource={(id, title, type) => {
          setSheetSource({ id, title, type });
        }}
      />

      <ContentSheet
        source={sheetSource}
        onClose={() => setSheetSource(null)}
      />
    </>
  );
}

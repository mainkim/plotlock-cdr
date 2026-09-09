"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type StudyNavContextValue = {
  studyId: string | null;
  joinCode: string | null;
  setStudyNav: (v: { studyId: string | null; joinCode?: string | null }) => void;
};

const StudyNavContext = createContext<StudyNavContextValue>({
  studyId: null,
  joinCode: null,
  setStudyNav: () => undefined
});

export function useStudyNav() {
  return useContext(StudyNavContext);
}

export function StudyNavProvider({
  studyId,
  joinCode,
  children
}: {
  studyId: string | null;
  joinCode?: string | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      studyId,
      joinCode: joinCode ?? null,
      setStudyNav: () => undefined
    }),
    [studyId, joinCode]
  );
  return <StudyNavContext.Provider value={value}>{children}</StudyNavContext.Provider>;
}

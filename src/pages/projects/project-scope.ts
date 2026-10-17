import { createContext, useContext } from "react";

/** Route-derived context, not a second source of selection state. */
export const ProjectScopeContext = createContext<string | undefined>(undefined);
export const useProjectScope = () => useContext(ProjectScopeContext);

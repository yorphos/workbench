import type { ReactNode } from "react";
export type RecipeState =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "disabled"
  | "long"
  | "stale"
  | "queued"
  | "running"
  | "interrupted"
  | "awaiting_review"
  | "uncertain";
export type RecipeRow = {
  id: string;
  name: string;
  details?: string;
  status?: string;
  revision?: number;
};
export interface RecipeProps {
  recipe: string;
  title?: string;
  description?: string;
  state?: RecipeState;
  rows?: RecipeRow[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onQuery?: (value: string) => void;
  onSort?: (reverse: boolean) => void;
  settings?: { name?: string; details?: string };
  onSave?: (values: { name: string; details: string }) => void;
  onSignIn?: () => void;
  onCreate?: (values: { name: string; details: string }) => void;
  onAccept?: () => void;
  onDiscard?: () => void;
  onCancel?: () => void;
  onResume?: () => void;
  before?: ReactNode;
  after?: ReactNode;
  task?: { status?: string; progress?: number; message?: string };
  receipt?: Record<string, string | number>;
  navigation?: { id: string; name: string }[];
  onNavigate?: (id: string) => void;
}
export const recipeStates: RecipeState[];
export function Recipe(props: RecipeProps): ReactNode;
export function Field(props: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}): ReactNode;
export function Panel(props: {
  title?: string;
  children: ReactNode;
  className?: string;
}): ReactNode;
export function ActionBar(props: { children: ReactNode }): ReactNode;
export function Button(props: any): ReactNode;

import type { Difficulty } from "../api/types";

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  Easy: "Fácil",
  Medium: "Media",
  Hard: "Difícil",
  Expert: "Experta",
};

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABELS[difficulty];
}

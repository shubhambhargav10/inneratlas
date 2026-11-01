import { AnswerOption } from "./types";

export function createLikertOptions(dimensionKey: string, reverse: boolean = false): AnswerOption[] {
  // If not reversed: Strongly Agree (5) pushes towards positive dimension (+2), Strongly Disagree (1) pushes negative (-2)
  // If reversed: Strongly Agree (5) pushes negative (-2), Strongly Disagree (1) pushes positive (+2)
  const multiplier = reverse ? -1 : 1;

  return [
    {
      id: "opt_1",
      label: "Strongly Disagree",
      value: 1,
      weights: { [dimensionKey]: -2 * multiplier },
    },
    {
      id: "opt_2",
      label: "Disagree",
      value: 2,
      weights: { [dimensionKey]: -1 * multiplier },
    },
    {
      id: "opt_3",
      label: "Neutral / In-Between",
      value: 3,
      weights: { [dimensionKey]: 0 },
    },
    {
      id: "opt_4",
      label: "Agree",
      value: 4,
      weights: { [dimensionKey]: 1 * multiplier },
    },
    {
      id: "opt_5",
      label: "Strongly Agree",
      value: 5,
      weights: { [dimensionKey]: 2 * multiplier },
    },
  ];
}

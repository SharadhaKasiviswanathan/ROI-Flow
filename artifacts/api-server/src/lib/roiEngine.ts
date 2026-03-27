export interface RoiResult {
  monthlyHoursLost: number;
  estimatedHoursSaved: number;
  complexityScore: number;
  roiScore: number;
  priority: "High" | "Medium" | "Low";
}

export function calculateRoi(
  frequencyPerMonth: number,
  minutesPerRun: number,
  peopleInvolved: number,
  appsCount: number,
): RoiResult {
  const rawMonthlyMinutes = frequencyPerMonth * minutesPerRun * peopleInvolved;
  const monthlyHoursLost = parseFloat((rawMonthlyMinutes / 60).toFixed(2));

  const complexityScore = Math.min(10, Math.max(1, Math.round(appsCount * 1.5 + (minutesPerRun > 30 ? 2 : 0))));
  const complexityPenalty = complexityScore / 10;

  const estimatedHoursSaved = parseFloat((monthlyHoursLost * (1 - complexityPenalty * 0.2)).toFixed(2));

  const volumeScore = Math.min(40, (monthlyHoursLost / 20) * 40);
  const frequencyScore = Math.min(30, (frequencyPerMonth / 30) * 30);
  const peopleScore = Math.min(20, (peopleInvolved / 5) * 20);
  const complexityBonus = Math.min(10, (1 - complexityPenalty) * 10);

  const rawRoi = volumeScore + frequencyScore + peopleScore + complexityBonus;
  const roiScore = Math.min(100, Math.max(0, Math.round(rawRoi)));

  let priority: "High" | "Medium" | "Low";
  if (roiScore >= 60) {
    priority = "High";
  } else if (roiScore >= 35) {
    priority = "Medium";
  } else {
    priority = "Low";
  }

  return {
    monthlyHoursLost,
    estimatedHoursSaved,
    complexityScore,
    roiScore,
    priority,
  };
}

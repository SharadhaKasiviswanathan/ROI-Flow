from dataclasses import dataclass


@dataclass
class RoiResult:
    monthly_hours_lost: float
    estimated_hours_saved: float
    complexity_score: int
    roi_score: int
    priority: str


def calculate_roi(
    frequency_per_month: int,
    minutes_per_run: int,
    people_involved: int,
    apps_count: int,
) -> RoiResult:
    raw_monthly_minutes = frequency_per_month * minutes_per_run * people_involved
    monthly_hours_lost = round(raw_monthly_minutes / 60, 2)

    complexity_score = min(10, max(1, round(apps_count * 1.5 + (2 if minutes_per_run > 30 else 0))))
    complexity_penalty = complexity_score / 10

    estimated_hours_saved = round(monthly_hours_lost * (1 - complexity_penalty * 0.2), 2)

    volume_score = min(40, (monthly_hours_lost / 20) * 40)
    frequency_score = min(30, (frequency_per_month / 30) * 30)
    people_score = min(20, (people_involved / 5) * 20)
    complexity_bonus = min(10, (1 - complexity_penalty) * 10)

    raw_roi = volume_score + frequency_score + people_score + complexity_bonus
    roi_score = min(100, max(0, round(raw_roi)))

    if roi_score >= 60:
        priority = "High"
    elif roi_score >= 35:
        priority = "Medium"
    else:
        priority = "Low"

    return RoiResult(
        monthly_hours_lost=monthly_hours_lost,
        estimated_hours_saved=estimated_hours_saved,
        complexity_score=complexity_score,
        roi_score=roi_score,
        priority=priority,
    )

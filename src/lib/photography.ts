// 天気データから「撮影指数」を計算するユーティリティ（UIから独立した純粋関数）

export type PhotographyInputs = {
  cloudCoverPercent: number; // 0-100
  rainProbabilityPercent: number; // 0-100
  humidityPercent: number; // 0-100
  windSpeedMs: number;
  visibilityMeters: number;
  temperatureC: number;
  uvIndex?: number;
};

export type PhotoCondition = {
  score: number;
  label: string;
  reason: string;
};

export type PhotographyScores = {
  sunset: PhotoCondition;
  stars: PhotoCondition;
  photoWalk: PhotoCondition;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function labelForScore(score: number): string {
  if (score >= 80) return "絶好の撮影日和";
  if (score >= 60) return "まずまず";
  if (score >= 40) return "条件に注意";
  return "おすすめしにくい";
}

function buildReason(positives: string[], negatives: string[]): string {
  const parts = negatives.length > 0 ? negatives : positives;
  return parts.slice(0, 2).join("。") || "標準的な条件です";
}

function scoreSunset(inputs: PhotographyInputs): PhotoCondition {
  let score = 100;
  const positives: string[] = [];
  const negatives: string[] = [];

  const cloud = inputs.cloudCoverPercent;
  if (cloud >= 20 && cloud <= 50) {
    positives.push("雲量が夕焼けに適した範囲です");
  } else if (cloud < 20) {
    const penalty = cloud < 10 ? 25 : 10;
    score -= penalty;
    negatives.push("雲が少なく空が焼けにくい可能性があります");
  } else if (cloud <= 70) {
    score -= 20;
    negatives.push("雲がやや多めです");
  } else {
    score -= 45;
    negatives.push("雲が多く空全体が覆われる可能性があります");
  }

  if (inputs.rainProbabilityPercent >= 60) {
    score -= 30;
    negatives.push("降水確率が高めです");
  } else if (inputs.rainProbabilityPercent >= 30) {
    score -= 15;
    negatives.push("降水確率がやや高めです");
  }

  if (inputs.visibilityMeters < 3000) {
    score -= 20;
    negatives.push("視程が悪めです");
  } else if (inputs.visibilityMeters < 6000) {
    score -= 8;
  }

  if (inputs.windSpeedMs >= 10) {
    score -= 15;
    negatives.push("風が強めです");
  } else if (inputs.windSpeedMs >= 7) {
    score -= 7;
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    label: labelForScore(finalScore),
    reason: buildReason(positives, negatives),
  };
}

function scoreStars(inputs: PhotographyInputs): PhotoCondition {
  let score = 100;
  const positives: string[] = [];
  const negatives: string[] = [];

  const cloud = inputs.cloudCoverPercent;
  if (cloud <= 10) {
    positives.push("雲がほとんどなく星が見えやすい予報です");
  } else if (cloud <= 30) {
    score -= 10;
  } else if (cloud <= 50) {
    score -= 25;
    negatives.push("雲がやや多めです");
  } else if (cloud <= 70) {
    score -= 45;
    negatives.push("雲が多く星が見えにくい可能性があります");
  } else {
    score -= 70;
    negatives.push("雲が多く星空撮影には厳しい予報です");
  }

  if (inputs.rainProbabilityPercent >= 40) {
    score -= 25;
    negatives.push("降水確率が高めです");
  } else if (inputs.rainProbabilityPercent >= 15) {
    score -= 10;
  }

  if (inputs.humidityPercent >= 85) {
    score -= 15;
    negatives.push("湿度が高くレンズが曇りやすい可能性があります");
  } else if (inputs.humidityPercent >= 70) {
    score -= 8;
  }

  if (inputs.visibilityMeters < 5000) {
    score -= 20;
    negatives.push("視程が悪めです");
  } else if (inputs.visibilityMeters < 8000) {
    score -= 8;
  }

  if (inputs.windSpeedMs >= 10) {
    score -= 15;
    negatives.push("風が強く三脚が揺れやすい可能性があります");
  } else if (inputs.windSpeedMs >= 6) {
    score -= 7;
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    label: labelForScore(finalScore),
    reason: buildReason(positives, negatives),
  };
}

function scorePhotoWalk(inputs: PhotographyInputs): PhotoCondition {
  let score = 100;
  const positives: string[] = [];
  const negatives: string[] = [];

  const temp = inputs.temperatureC;
  if (temp >= 18 && temp <= 26) {
    positives.push("気温が過ごしやすい範囲です");
  } else if (temp < 18) {
    const diff = 18 - temp;
    score -= Math.min(40, diff * 3);
    negatives.push("肌寒く感じられる可能性があります");
  } else {
    const diff = temp - 26;
    score -= Math.min(40, diff * 3);
    negatives.push("暑さが厳しくなる可能性があります");
  }

  if (inputs.rainProbabilityPercent >= 50) {
    score -= 30;
    negatives.push("降水確率が高めです");
  } else if (inputs.rainProbabilityPercent >= 25) {
    score -= 15;
    negatives.push("にわか雨の可能性があります");
  }

  if (inputs.windSpeedMs >= 12) {
    score -= 20;
    negatives.push("風が強めです");
  } else if (inputs.windSpeedMs >= 8) {
    score -= 10;
  }

  if (typeof inputs.uvIndex === "number") {
    if (inputs.uvIndex >= 9) {
      score -= 15;
      negatives.push("UV指数が非常に高い予報です");
    } else if (inputs.uvIndex >= 7) {
      score -= 8;
    }
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    label: labelForScore(finalScore),
    reason: buildReason(positives, negatives),
  };
}

export function calculatePhotographyScores(inputs: PhotographyInputs): PhotographyScores {
  return {
    sunset: scoreSunset(inputs),
    stars: scoreStars(inputs),
    photoWalk: scorePhotoWalk(inputs),
  };
}

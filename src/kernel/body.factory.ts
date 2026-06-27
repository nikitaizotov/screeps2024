/**
 * Builds a creep body by repeating a "unit" body to fill an energy budget.
 * Reuses the bot's existing dynamic-sizing idea, but driven by kernel demand.
 */
export function buildBody(
  unit: BodyPartConstant[],
  energy: number,
  maxParts: number = 50
): BodyPartConstant[] {
  const unitCost = unit.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  if (unitCost === 0 || unit.length === 0) return [];

  let times = Math.floor(energy / unitCost);
  const maxTimes = Math.floor(maxParts / unit.length);
  if (times > maxTimes) times = maxTimes;
  if (times < 1) return [];

  const body: BodyPartConstant[] = [];
  for (let i = 0; i < times; i++) body.push(...unit);
  return body;
}

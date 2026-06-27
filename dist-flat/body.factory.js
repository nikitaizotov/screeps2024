"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBody = buildBody;
/**
 * Builds a creep body by repeating a "unit" body to fill an energy budget.
 * Reuses the bot's existing dynamic-sizing idea, but driven by kernel demand.
 */
function buildBody(unit, energy, maxParts = 50) {
    const unitCost = unit.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    if (unitCost === 0 || unit.length === 0)
        return [];
    let times = Math.floor(energy / unitCost);
    const maxTimes = Math.floor(maxParts / unit.length);
    if (times > maxTimes)
        times = maxTimes;
    if (times < 1)
        return [];
    const body = [];
    for (let i = 0; i < times; i++)
        body.push(...unit);
    return body;
}

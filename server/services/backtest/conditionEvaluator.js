const OPERATORS = {
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  ">=": (a, b) => a >= b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a == b,
  "!=": (a, b) => a != b,
};

export const evaluateConditions = ({ block, context }) => {
  if (!block) return false;

  const results = block.conditions.map((cond) => {
    const left =
      typeof cond.left === "string" ? 
      context.indicators[cond.left] : cond.left;

    const right =
      typeof cond.right === "string"
        ? context.indicators[cond.right]
        : cond.right;

    if (left == null || right == null) return false;

    return OPERATORS[cond.operator](left, right);
  });

  if (block.logic === "and") return results.every(Boolean);
  if (block.logic === "or") return results.some(Boolean);

  return false;
};

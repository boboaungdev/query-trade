const getNestedValue = (target, path) => {
  if (!target || !path) return undefined;

  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, target);
};

const resolveOperandValue = (operand, context) => {
  if (operand == null) return null;

  if (
    typeof operand === "number" ||
    typeof operand === "boolean" ||
    Array.isArray(operand) ||
    typeof operand === "object"
  ) {
    return operand;
  }

  if (typeof operand !== "string") {
    return operand;
  }

  const candleValue = getNestedValue(context?.candle, operand);
  if (candleValue !== undefined) {
    return candleValue;
  }

  const indicatorValue = getNestedValue(context?.indicators, operand);
  if (indicatorValue !== undefined) {
    return indicatorValue;
  }

  return operand;
};

const hasComparableValues = (...values) =>
  values.every((value) => value !== null && value !== undefined);

const compareValues = ({ operator, left, right, previousLeft, previousRight }) => {
  if (operator === "crossAbove") {
    return (
      hasComparableValues(left, right, previousLeft, previousRight) &&
      previousLeft <= previousRight &&
      left > right
    );
  }

  if (operator === "crossBelow") {
    return (
      hasComparableValues(left, right, previousLeft, previousRight) &&
      previousLeft >= previousRight &&
      left < right
    );
  }

  if (!hasComparableValues(left, right)) {
    return false;
  }

  switch (operator) {
    case ">":
      return left > right;
    case "<":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    default:
      return false;
  }
};

export const evaluateCondition = ({
  condition,
  context,
  previousContext,
}) => {
  if (!condition) return false;

  if (Array.isArray(condition.conditions) && condition.conditions.length) {
    const method = condition.logic === "or" ? "some" : "every";

    return condition.conditions[method]((childCondition) =>
      evaluateCondition({
        condition: childCondition,
        context,
        previousContext,
      }),
    );
  }

  const left = resolveOperandValue(condition.left, context);
  const right = resolveOperandValue(condition.right, context);
  const previousLeft = resolveOperandValue(condition.left, previousContext);
  const previousRight = resolveOperandValue(condition.right, previousContext);

  return compareValues({
    operator: condition.operator,
    left,
    right,
    previousLeft,
    previousRight,
  });
};

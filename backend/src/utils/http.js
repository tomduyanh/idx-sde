function parsePositiveInt(value, fallback, options = {}) {
  const parsed = Number.parseInt(value, 10);
  const max = options.max || Number.MAX_SAFE_INTEGER;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isNumeric(value) {
  return !hasValue(value) || Number.isFinite(Number(value));
}

function isPositiveInteger(value) {
  if (!hasValue(value)) {
    return true;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isIsoDate(value) {
  if (!hasValue(value)) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
}

function rejectBadRequest(res, errors) {
  return res.status(400).json({
    error: "Invalid query parameters",
    details: errors,
  });
}

function sendServerError(res, err) {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = {
  hasValue,
  isIsoDate,
  isNumeric,
  isPositiveInteger,
  parseNumber,
  parsePositiveInt,
  rejectBadRequest,
  sendServerError,
};

const express = require("express");
const pool = require("../db");
const {
  hasValue,
  isIsoDate,
  isPositiveInteger,
  parsePositiveInt,
  rejectBadRequest,
  sendServerError,
} = require("../utils/http");

const router = express.Router();

const openHouseColumns = `
  oh.id,
  oh.L_ListingID AS listingId,
  oh.L_DisplayId AS displayId,
  oh.OpenHouseDate AS date,
  oh.OH_StartTime AS startTime,
  oh.OH_EndTime AS endTime,
  oh.API_OH_StartDate AS startsAt,
  oh.API_OH_EndDate AS endsAt,
  p.L_Address AS address,
  p.L_City AS city,
  p.L_State AS state,
  p.L_Zip AS zip,
  p.L_SystemPrice AS price,
  p.L_Keyword2 AS beds,
  p.LM_Dec_3 AS baths,
  p.LM_Int2_3 AS livingArea,
  p.L_Photos AS photos
`;

function parsePhotos(rawPhotos) {
  if (!rawPhotos) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawPhotos);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function normalizeOpenHouse(row) {
  return {
    ...row,
    price: row.price === null ? null : Number(row.price),
    beds: row.beds === null ? null : Number(row.beds),
    baths: row.baths === null ? null : Number(row.baths),
    livingArea: row.livingArea === null ? null : Number(row.livingArea),
    photos: parsePhotos(row.photos),
  };
}

function buildOpenHouseFilters(query) {
  const filters = [];
  const values = [];

  if (hasValue(query.listingId)) {
    filters.push("(oh.L_ListingID = ? OR oh.L_DisplayId = ?)");
    values.push(query.listingId.trim(), query.listingId.trim());
  }

  if (hasValue(query.from)) {
    filters.push("oh.OpenHouseDate >= ?");
    values.push(query.from.trim());
  }

  if (hasValue(query.to)) {
    filters.push("oh.OpenHouseDate <= ?");
    values.push(query.to.trim());
  }

  if (hasValue(query.city)) {
    filters.push("p.L_City LIKE ?");
    values.push(`%${query.city.trim()}%`);
  }

  return {
    whereSql: filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "",
    values,
  };
}

function validateOpenHouseQuery(query) {
  const errors = [];

  for (const field of ["page", "limit"]) {
    if (!isPositiveInteger(query[field])) {
      errors.push(`${field} must be a positive integer`);
    }
  }

  for (const field of ["from", "to"]) {
    if (!isIsoDate(query[field])) {
      errors.push(`${field} must use YYYY-MM-DD format`);
    }
  }

  if (hasValue(query.from) && hasValue(query.to) && query.from > query.to) {
    errors.push("from must be earlier than or equal to to");
  }

  return errors;
}

// GET /api/open-houses
// Supports listingId, from, to, city, page, and limit query parameters.
router.get("/", async (req, res) => {
  const validationErrors = validateOpenHouseQuery(req.query);
  if (validationErrors.length > 0) {
    return rejectBadRequest(res, validationErrors);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 20, { max: 100 });
  const offset = (page - 1) * limit;
  const { whereSql, values } = buildOpenHouseFilters(req.query);

  try {
    const [countRows] = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM rets_openhouse oh
        LEFT JOIN rets_property p ON p.L_DisplayId = oh.L_DisplayId
        ${whereSql}
      `,
      values
    );
    const [rows] = await pool.query(
      `
        SELECT ${openHouseColumns}
        FROM rets_openhouse oh
        LEFT JOIN rets_property p ON p.L_DisplayId = oh.L_DisplayId
        ${whereSql}
        ORDER BY oh.OpenHouseDate ASC, oh.OH_StartTime ASC, oh.id ASC
        LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    const total = Number(countRows[0].total);

    res.json({
      data: rows.map(normalizeOpenHouse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    sendServerError(res, err);
  }
});

module.exports = router;

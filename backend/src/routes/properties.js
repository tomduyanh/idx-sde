const express = require("express");
const pool = require("../db");
const {
  hasValue,
  isNumeric,
  isPositiveInteger,
  parseNumber,
  parsePositiveInt,
  rejectBadRequest,
  sendServerError,
} = require("../utils/http");

const router = express.Router();
const listingIdPattern = /^[A-Za-z0-9-]+$/;

const listColumns = `
  id,
  L_ListingID AS listingId,
  L_DisplayId AS displayId,
  L_Address AS address,
  L_City AS city,
  L_State AS state,
  L_Zip AS zip,
  L_Status AS status,
  StandardStatus AS standardStatus,
  L_Type_ AS propertyType,
  L_SystemPrice AS price,
  L_Keyword2 AS beds,
  LM_Dec_3 AS baths,
  LM_Int2_3 AS livingArea,
  LotSizeSquareFeet AS lotSizeSquareFeet,
  LMD_MP_Latitude AS latitude,
  LMD_MP_Longitude AS longitude,
  PhotoCount AS photoCount,
  L_Photos AS photos,
  ModificationTimestamp AS modifiedAt
`;

const detailColumns = `
  ${listColumns},
  L_Remarks AS remarks,
  YearBuilt AS yearBuilt,
  DaysOnMarket AS daysOnMarket,
  GarageYN AS hasGarage,
  PoolPrivateYN AS hasPrivatePool,
  View AS view,
  Cooling AS cooling,
  Heating AS heating,
  Flooring AS flooring,
  Appliances AS appliances,
  InteriorFeatures AS interiorFeatures,
  PatioAndPorchFeatures AS patioAndPorchFeatures,
  CommunityFeatures AS communityFeatures,
  ListAgentFullName AS listAgentName,
  ListAgentEmail AS listAgentEmail,
  ListAgentDirectPhone AS listAgentPhone,
  LO1_OrganizationName AS listOfficeName
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

function normalizeProperty(row) {
  return {
    ...row,
    price: row.price === null ? null : Number(row.price),
    beds: row.beds === null ? null : Number(row.beds),
    baths: row.baths === null ? null : Number(row.baths),
    livingArea: row.livingArea === null ? null : Number(row.livingArea),
    lotSizeSquareFeet:
      row.lotSizeSquareFeet === null ? null : Number(row.lotSizeSquareFeet),
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    photoCount: row.photoCount === null ? null : Number(row.photoCount),
    photos: parsePhotos(row.photos),
  };
}

function normalizeOpenHouse(row) {
  return {
    ...row,
    allData: row.allData || null,
  };
}

function validateListingId(id) {
  const normalizedId = String(id || "").trim();

  if (!normalizedId) {
    return {
      value: null,
      errors: ["listing ID is required"],
    };
  }

  if (normalizedId.length > 64) {
    return {
      value: null,
      errors: ["listing ID must be 64 characters or fewer"],
    };
  }

  if (!listingIdPattern.test(normalizedId)) {
    return {
      value: null,
      errors: ["listing ID may only contain letters, numbers, and hyphens"],
    };
  }

  return {
    value: normalizedId,
    errors: [],
  };
}

async function findPropertyByListingId(listingId) {
  const [rows] = await pool.query(
    `
      SELECT ${detailColumns}
      FROM rets_property
      WHERE L_ListingID = ? OR L_DisplayId = ?
      LIMIT 1
    `,
    [listingId, listingId]
  );

  return rows[0] || null;
}

async function findOpenHousesByListingId(listingId) {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        L_ListingID AS listingId,
        L_DisplayId AS displayId,
        OpenHouseDate AS date,
        OH_StartTime AS startTime,
        OH_EndTime AS endTime,
        OH_StartDate AS startDate,
        OH_EndDate AS endDate,
        API_OH_StartDate AS startsAt,
        API_OH_EndDate AS endsAt,
        all_data AS allData
      FROM rets_openhouse
      WHERE L_ListingID = ? OR L_DisplayId = ?
      ORDER BY OpenHouseDate ASC, OH_StartTime ASC, id ASC
    `,
    [listingId, listingId]
  );

  return rows.map(normalizeOpenHouse);
}

function buildPropertyFilters(query) {
  const filters = [];
  const values = [];

  if (hasValue(query.city)) {
    filters.push("L_City LIKE ?");
    values.push(`%${query.city.trim()}%`);
  }

  if (hasValue(query.zip)) {
    filters.push("L_Zip = ?");
    values.push(query.zip.trim());
  }

  if (hasValue(query.status)) {
    filters.push("(L_Status = ? OR StandardStatus = ?)");
    values.push(query.status.trim(), query.status.trim());
  }

  if (hasValue(query.type)) {
    filters.push("L_Type_ = ?");
    values.push(query.type.trim());
  }

  if (hasValue(query.q)) {
    const search = `%${query.q.trim()}%`;
    filters.push(
      "(L_DisplayId LIKE ? OR L_Address LIKE ? OR L_City LIKE ? OR L_Remarks LIKE ?)"
    );
    values.push(search, search, search, search);
  }

  const minPrice = parseNumber(query.minPrice);
  if (minPrice !== null) {
    filters.push("L_SystemPrice >= ?");
    values.push(minPrice);
  }

  const maxPrice = parseNumber(query.maxPrice);
  if (maxPrice !== null) {
    filters.push("L_SystemPrice <= ?");
    values.push(maxPrice);
  }

  const minBeds = parseNumber(query.minBeds);
  if (minBeds !== null) {
    filters.push("L_Keyword2 >= ?");
    values.push(minBeds);
  }

  const minBaths = parseNumber(query.minBaths);
  if (minBaths !== null) {
    filters.push("LM_Dec_3 >= ?");
    values.push(minBaths);
  }

  return {
    whereSql: filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "",
    values,
  };
}

function validatePropertyQuery(query) {
  const errors = [];

  for (const field of ["page", "limit"]) {
    if (!isPositiveInteger(query[field])) {
      errors.push(`${field} must be a positive integer`);
    }
  }

  for (const field of ["minPrice", "maxPrice", "minBeds", "minBaths"]) {
    if (!isNumeric(query[field])) {
      errors.push(`${field} must be a number`);
    }
  }

  const minPrice = parseNumber(query.minPrice);
  const maxPrice = parseNumber(query.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    errors.push("minPrice must be less than or equal to maxPrice");
  }

  return errors;
}

// GET /api/properties
// Supports city, zip, status, type, q, minPrice, maxPrice, minBeds, minBaths,
// page, and limit query parameters.
router.get("/", async (req, res) => {
  const validationErrors = validatePropertyQuery(req.query);
  if (validationErrors.length > 0) {
    return rejectBadRequest(res, validationErrors);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 20, { max: 100 });
  const offset = (page - 1) * limit;
  const { whereSql, values } = buildPropertyFilters(req.query);

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM rets_property ${whereSql}`,
      values
    );
    const [rows] = await pool.query(
      `
        SELECT ${listColumns}
        FROM rets_property
        ${whereSql}
        ORDER BY ModificationTimestamp DESC, id DESC
        LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    const total = Number(countRows[0].total);

    res.json({
      data: rows.map(normalizeProperty),
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

// GET /api/properties/:id/openhouses
// This specific route must be registered before /:id so Express does not treat
// "openhouses" as part of the ID route.
router.get("/:id/openhouses", async (req, res) => {
  const { value: listingId, errors } = validateListingId(req.params.id);
  if (errors.length > 0) {
    return rejectBadRequest(res, errors);
  }

  try {
    const property = await findPropertyByListingId(listingId);
    if (!property) {
      return res.status(404).json({
        error: "Property not found",
        message: `No property found for listing ID ${listingId}`,
      });
    }

    const openHouses = await findOpenHousesByListingId(listingId);
    res.json({ data: openHouses });
  } catch (err) {
    sendServerError(res, err);
  }
});

// GET /api/properties/:id
router.get("/:id", async (req, res) => {
  const { value: listingId, errors } = validateListingId(req.params.id);
  if (errors.length > 0) {
    return rejectBadRequest(res, errors);
  }

  try {
    const property = await findPropertyByListingId(listingId);
    if (!property) {
      return res.status(404).json({
        error: "Property not found",
        message: `No property found for listing ID ${listingId}`,
      });
    }

    res.json({ data: normalizeProperty(property) });
  } catch (err) {
    sendServerError(res, err);
  }
});

module.exports = router;

const { query } = require('./db');

async function upsertUser(tgUser) {
  const { rows } = await query(
    `INSERT INTO users (telegram_id, username, first_name, last_active_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (telegram_id) DO UPDATE
       SET username = EXCLUDED.username,
           first_name = EXCLUDED.first_name,
           last_active_at = now()
     RETURNING *`,
    [tgUser.id, tgUser.username || null, tgUser.first_name || null]
  );
  return rows[0];
}

async function getUserByTelegramId(telegramId) {
  const { rows } = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0] || null;
}

async function isAdmin(telegramId, configAdminIds) {
  if (configAdminIds.includes(Number(telegramId))) return true;
  const user = await getUserByTelegramId(telegramId);
  return user && ['admin', 'super_admin', 'moderator'].includes(user.role);
}

async function listCategories() {
  const { rows } = await query('SELECT * FROM categories ORDER BY name ASC');
  return rows;
}

async function getCategoryBySlug(slug) {
  const { rows } = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function getCategoryById(id) {
  if (!id) return null;
  const { rows } = await query('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0] || null;
}

async function nearbyPlaces({ lat, lng, radiusKm, categorySlug, limit = 8 }) {
  const params = [lat, lng, radiusKm];
  let categoryJoin = '';
  if (categorySlug) {
    categoryJoin = 'AND c.slug = $4';
    params.push(categorySlug);
  }
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.icon AS category_icon,
       (6371 * acos(
          cos(radians($1)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(p.latitude))
       )) AS distance_km
     FROM places p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'approved'
       AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       ${categoryJoin}
     HAVING (6371 * acos(
          cos(radians($1)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(p.latitude))
       )) <= $3
     ORDER BY distance_km ASC
     LIMIT ${limit}`,
    params
  );
  return rows;
}

async function newestPlaces(limit = 10) {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.icon AS category_icon
     FROM places p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'approved'
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function randomPlace({ categorySlug, priceLevel } = {}) {
  const clauses = [`status = 'approved'`];
  const params = [];
  if (categorySlug) {
    params.push(categorySlug);
    clauses.push(`category_id = (SELECT id FROM categories WHERE slug = $${params.length})`);
  }
  if (priceLevel) {
    params.push(priceLevel);
    clauses.push(`price_level = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.icon AS category_icon
     FROM places p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY random()
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

async function getPlaceById(id) {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.icon AS category_icon
     FROM places p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function placeRatingSummary(placeId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS avg
     FROM reviews WHERE place_id = $1 AND status = 'approved'`,
    [placeId]
  );
  return { count: rows[0].count, avg: rows[0].avg };
}

async function searchPlaces(term, limit = 8) {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.icon AS category_icon
     FROM places p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'approved'
       AND (p.name ILIKE $1 OR p.description ILIKE $1)
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [`%${term}%`, limit]
  );
  return rows;
}

async function createPendingPlace(data) {
  const { rows } = await query(
    `INSERT INTO places (name, description, category_id, latitude, longitude, address, price_level, photo_file_id, added_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.categoryId || null,
      data.latitude || null,
      data.longitude || null,
      data.address || null,
      data.priceLevel || 2,
      data.photoFileId || null,
      data.addedBy,
    ]
  );
  return rows[0];
}

async function pendingPlaces(limit = 10) {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name FROM places p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'pending' ORDER BY p.created_at ASC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function setPlaceStatus(id, status) {
  const { rows } = await query(`UPDATE places SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`, [id, status]);
  return rows[0];
}

async function upcomingEvents({ fromDate, toDate, limit = 8 } = {}) {
  const params = [];
  const clauses = [`status = 'approved'`];
  if (fromDate) {
    params.push(fromDate);
    clauses.push(`start_at >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    clauses.push(`start_at <= $${params.length}`);
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT e.*, c.name AS category_name, c.icon AS category_icon
     FROM events e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY start_at ASC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

async function getEventById(id) {
  const { rows } = await query(
    `SELECT e.*, c.name AS category_name, c.icon AS category_icon
     FROM events e LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function pendingEvents(limit = 10) {
  const { rows } = await query(
    `SELECT * FROM events WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function setEventStatus(id, status) {
  const { rows } = await query(`UPDATE events SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
  return rows[0];
}

async function toggleFavorite(userId, placeId) {
  const { rows } = await query('SELECT 1 FROM favorites WHERE user_id = $1 AND place_id = $2', [userId, placeId]);
  if (rows.length > 0) {
    await query('DELETE FROM favorites WHERE user_id = $1 AND place_id = $2', [userId, placeId]);
    return false;
  }
  await query('INSERT INTO favorites (user_id, place_id) VALUES ($1, $2)', [userId, placeId]);
  return true;
}

async function isFavorite(userId, placeId) {
  const { rows } = await query('SELECT 1 FROM favorites WHERE user_id = $1 AND place_id = $2', [userId, placeId]);
  return rows.length > 0;
}

async function listFavorites(userId, limit = 15) {
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, c.icon AS category_icon
     FROM favorites f
     JOIN places p ON p.id = f.place_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function createPendingReview({ placeId, userId, rating, text, tags }) {
  const { rows } = await query(
    `INSERT INTO reviews (place_id, user_id, rating, text, tags, status)
     VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [placeId, userId, rating, text || null, tags]
  );
  return rows[0];
}

async function pendingReviews(limit = 10) {
  const { rows } = await query(
    `SELECT r.*, p.name AS place_name FROM reviews r
     JOIN places p ON p.id = r.place_id
     WHERE r.status = 'pending' ORDER BY r.created_at ASC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function setReviewStatus(id, status) {
  const { rows } = await query(`UPDATE reviews SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
  return rows[0];
}

async function userStats(telegramId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM reviews WHERE user_id = $1) AS review_count,
       (SELECT COUNT(*)::int FROM places WHERE added_by = $1) AS places_added,
       (SELECT COUNT(*)::int FROM favorites f JOIN users u ON u.id = f.user_id WHERE u.telegram_id = $1) AS favorites_count`,
    [telegramId]
  );
  return rows[0];
}

async function createReport({ userId, entityType, entityId, reason }) {
  await query(
    `INSERT INTO reports (user_id, entity_type, entity_id, reason) VALUES ($1,$2,$3,$4)`,
    [userId, entityType, entityId, reason || null]
  );
}

async function logAdminAction({ adminTelegramId, action, entityType, entityId, details }) {
  await query(
    `INSERT INTO admin_audit_log (admin_telegram_id, action, entity_type, entity_id, details)
     VALUES ($1,$2,$3,$4,$5)`,
    [adminTelegramId, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null]
  );
}

module.exports = {
  upsertUser,
  getUserByTelegramId,
  isAdmin,
  listCategories,
  getCategoryBySlug,
  getCategoryById,
  nearbyPlaces,
  newestPlaces,
  randomPlace,
  getPlaceById,
  placeRatingSummary,
  searchPlaces,
  createPendingPlace,
  pendingPlaces,
  setPlaceStatus,
  upcomingEvents,
  getEventById,
  pendingEvents,
  setEventStatus,
  toggleFavorite,
  isFavorite,
  listFavorites,
  createPendingReview,
  pendingReviews,
  setReviewStatus,
  userStats,
  createReport,
  logAdminAction,
};

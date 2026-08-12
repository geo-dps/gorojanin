const { formatDistance } = require('./geo');

function priceLabel(level) {
  return '€'.repeat(Math.min(Math.max(level || 1, 1), 4));
}

function placeCardText(place, { distanceKm, categoryName, categoryIcon, avgRating, reviewCount } = {}) {
  const lines = [];
  const icon = categoryIcon ? `${categoryIcon} ` : '';
  lines.push(`${icon}*${escapeMd(place.name)}*`);

  const meta = [];
  if (avgRating) meta.push(`⭐ ${avgRating.toFixed(1)} · ${reviewCount} отз.`);
  if (typeof distanceKm === 'number') meta.push(`📍 ${formatDistance(distanceKm)}`);
  meta.push(priceLabel(place.price_level));
  if (place.hidden_gem) meta.push('💎 Hidden Gem');
  if (meta.length) lines.push(meta.join(' · '));

  if (categoryName) lines.push(`Категория: ${categoryName}`);
  if (place.description) lines.push('', escapeMd(place.description));
  if (place.address) lines.push('', `🏠 ${escapeMd(place.address)}`);

  return lines.join('\n');
}

function eventCardText(event, { categoryName, categoryIcon } = {}) {
  const lines = [];
  const icon = categoryIcon ? `${categoryIcon} ` : '🎵 ';
  lines.push(`${icon}*${escapeMd(event.name)}*`);

  const dt = new Date(event.start_at);
  const dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
  const timeStr = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  lines.push(`🗓 ${dateStr} в ${timeStr}`);

  if (event.price) lines.push(`💶 ${escapeMd(event.price)}`);
  if (categoryName) lines.push(`Категория: ${categoryName}`);
  if (event.address) lines.push(`📍 ${escapeMd(event.address)}`);
  if (event.description) lines.push('', escapeMd(event.description));

  return lines.join('\n');
}

// Minimal escaping for Telegram Markdown (legacy 'Markdown' parse mode).
function escapeMd(text) {
  if (!text) return '';
  return String(text).replace(/([_*`[\]])/g, '\\$1');
}

module.exports = { priceLabel, placeCardText, eventCardText, escapeMd };

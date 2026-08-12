const { Markup } = require('telegraf');
const config = require('./config');

function mainMenu() {
  return Markup.keyboard([
    ['📍 Рядом со мной', '🆕 Новинки'],
    ['🎵 События', '❤️ Избранное'],
    ['🎲 Удиви меня', '➕ Добавить место'],
    ['👤 Профиль', 'ℹ️ Помощь'],
  ]).resize();
}

function requestLocationKeyboard() {
  return Markup.keyboard([
    [Markup.button.locationRequest('📍 Отправить геолокацию')],
    ['⬅️ Назад'],
  ]).resize();
}

function categoriesInlineKeyboard(categories, { prefix = 'cat', extraRow } = {}) {
  const rows = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = categories.slice(i, i + 2).map((c) =>
      Markup.button.callback(`${c.icon || ''} ${c.name}`.trim(), `${prefix}:${c.slug}`)
    );
    rows.push(row);
  }
  if (extraRow) rows.push(extraRow);
  return Markup.inlineKeyboard(rows);
}

function priceInlineKeyboard(prefix = 'price') {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('€', `${prefix}:1`),
      Markup.button.callback('€€', `${prefix}:2`),
      Markup.button.callback('€€€', `${prefix}:3`),
      Markup.button.callback('€€€€', `${prefix}:4`),
    ],
  ]);
}

function placeCardKeyboard(place, { isFavorite = false } = {}) {
  const rows = [
    [
      Markup.button.url('🗺 Маршрут', `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`),
      Markup.button.callback(isFavorite ? '💔 Убрать' : '❤️ Сохранить', `fav:${place.id}`),
    ],
    [
      Markup.button.callback('📝 Оставить отзыв', `review:start:${place.id}`),
      Markup.button.url('📤 Поделиться', shareUrlFor(place)),
    ],
    [Markup.button.callback('⚠️ Сообщить об ошибке', `report:place:${place.id}`)],
  ];
  return Markup.inlineKeyboard(rows);
}

// Builds a t.me/share link that opens the place's deep link inside the bot,
// via Telegram's official share sheet — works without enabling inline mode.
function shareUrlFor(place) {
  const deepLink = config.botUsername
    ? `https://t.me/${config.botUsername}?start=place_${place.id}`
    : `https://t.me/share/url`;
  const text = encodeURIComponent(`Нашёл крутое место в ${config.cityName} 👀 ${place.name}`);
  return `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${text}`;
}

function ratingInlineKeyboard(placeId) {
  return Markup.inlineKeyboard([
    [1, 2, 3, 4, 5].map((n) => Markup.button.callback('⭐'.repeat(n), `review:rate:${placeId}:${n}`)),
  ]);
}

function reviewTagsInlineKeyboard(placeId, selected = []) {
  const tags = [
    ['worth_it', '👍 Стоит идти'],
    ['hidden_gem', '💎 Скрытая жемчужина'],
    ['good_price', '💰 Хорошая цена'],
    ['atmosphere', '🔥 Атмосфера'],
    ['date', '❤️ Для свидания'],
    ['average', '😐 Нормально'],
    ['not_recommended', '👎 Не рекомендую'],
    ['overrated', '🤡 Переоценено'],
  ];
  const rows = [];
  for (let i = 0; i < tags.length; i += 2) {
    const row = tags.slice(i, i + 2).map(([key, label]) => {
      const mark = selected.includes(key) ? '✅ ' : '';
      return Markup.button.callback(`${mark}${label}`, `review:tag:${placeId}:${key}`);
    });
    rows.push(row);
  }
  rows.push([Markup.button.callback('➡️ Далее', `review:tagsdone:${placeId}`)]);
  return Markup.inlineKeyboard(rows);
}

function adminModerationKeyboard(entityType, id) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Одобрить', `admin:${entityType}:approve:${id}`),
      Markup.button.callback('❌ Отклонить', `admin:${entityType}:reject:${id}`),
    ],
  ]);
}

module.exports = {
  mainMenu,
  requestLocationKeyboard,
  categoriesInlineKeyboard,
  priceInlineKeyboard,
  placeCardKeyboard,
  ratingInlineKeyboard,
  reviewTagsInlineKeyboard,
  adminModerationKeyboard,
  shareUrlFor,
};

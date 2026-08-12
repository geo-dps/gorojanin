const repo = require('../repo');
const { placeCardText } = require('../utils/format');
const { Markup } = require('telegraf');

const KNOWN_BUTTON_LABELS = new Set([
  '📍 Рядом со мной',
  '🆕 Новинки',
  '🎵 События',
  '❤️ Избранное',
  '🎲 Удиви меня',
  '➕ Добавить место',
  '👤 Профиль',
  'ℹ️ Помощь',
  '⬅️ Назад',
]);

function register(bot) {
  // Plain text messages that aren't menu buttons and aren't part of an active
  // scene (Telegraf skips scene-owned text automatically) are treated as search.
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return next();
    if (KNOWN_BUTTON_LABELS.has(text)) return next();
    if (text.length < 2) return next();

    const results = await repo.searchPlaces(text, 6);
    if (results.length === 0) {
      await ctx.reply(
        `Ничего не нашёл по запросу «${text}». Попробуй короче или загляни в «Рядом со мной» / «Новинки».`
      );
      return;
    }

    await ctx.reply(`🔍 По запросу «${text}» нашёл:`);
    for (const place of results) {
      const t = placeCardText(place, { categoryName: place.category_name, categoryIcon: place.category_icon });
      await ctx.reply(t, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❤️ Сохранить', `fav:${place.id}`)]]),
      });
    }
  });
}

module.exports = { register };

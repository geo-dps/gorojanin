const repo = require('../repo');
const { placeCardText } = require('../utils/format');
const { Markup } = require('telegraf');

async function sendRandom(ctx, filters = {}) {
  const place = await repo.randomPlace(filters);
  if (!place) {
    await ctx.reply('Не нашёл подходящих мест под эти фильтры 🤔 Попробуй без фильтра.');
    return;
  }
  const text = placeCardText(place, { categoryName: place.category_name, categoryIcon: place.category_icon });
  const filterKey = encodeFilters(filters);
  await ctx.reply(`Идём сюда? 🎲\n\n${text}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.url('🗺 Маршрут', `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`),
        Markup.button.callback('❤️ Сохранить', `fav:${place.id}`),
      ],
      [Markup.button.callback('🎲 Ещё вариант', `random:again:${filterKey}`)],
    ]),
  });
}

function encodeFilters(filters) {
  return Buffer.from(JSON.stringify(filters)).toString('base64url').slice(0, 60);
}
function decodeFilters(key) {
  try {
    return JSON.parse(Buffer.from(key, 'base64url').toString('utf8'));
  } catch (e) {
    return {};
  }
}

function register(bot) {
  const trigger = (ctx) => sendRandom(ctx);
  bot.command('random', trigger);
  bot.hears('🎲 Удиви меня', trigger);

  bot.action(/^random:again:(.*)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await sendRandom(ctx, decodeFilters(ctx.match[1]));
  });
}

module.exports = { register, sendRandom };

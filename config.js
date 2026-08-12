const repo = require('../repo');
const { placeCardText } = require('../utils/format');
const { Markup } = require('telegraf');

function register(bot) {
  const trigger = async (ctx) => {
    const user = await repo.upsertUser(ctx.from);
    const places = await repo.listFavorites(user.id, 15);
    if (places.length === 0) {
      await ctx.reply('Сохраняй места, чтобы вернуться к ним позже ❤️');
      return;
    }
    await ctx.reply(`❤️ Твоё избранное (${places.length}):`);
    for (const place of places) {
      const text = placeCardText(place, { categoryName: place.category_name, categoryIcon: place.category_icon });
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.url('🗺 Маршрут', `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`),
            Markup.button.callback('💔 Убрать', `fav:${place.id}`),
          ],
        ]),
      });
    }
  };

  bot.command('favorites', trigger);
  bot.hears('❤️ Избранное', trigger);
}

module.exports = { register };

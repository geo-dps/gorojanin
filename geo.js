const repo = require('../repo');
const { placeCardText } = require('../utils/format');
const { Markup } = require('telegraf');

function register(bot) {
  const trigger = async (ctx) => {
    const places = await repo.newestPlaces(8);
    if (places.length === 0) {
      await ctx.reply('Пока здесь тихо 👀 Новых мест ещё не добавили.');
      return;
    }
    await ctx.reply('🆕 Новое в городе:');
    for (const place of places) {
      const text = placeCardText(place, { categoryName: place.category_name, categoryIcon: place.category_icon });
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❤️ Сохранить', `fav:${place.id}`), Markup.button.callback('ℹ️ Подробнее', `place:view:${place.id}`)],
        ]),
      });
    }
  };

  bot.command('new', trigger);
  bot.hears('🆕 Новинки', trigger);
}

module.exports = { register };

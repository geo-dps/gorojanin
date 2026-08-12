const repo = require('../repo');
const config = require('../config');
const { requestLocationKeyboard, mainMenu, categoriesInlineKeyboard } = require('../keyboards');
const { placeCardText } = require('../utils/format');

function register(bot) {
  const trigger = async (ctx) => {
    await ctx.reply(
      'Отправь геолокацию, и я покажу места рядом с тобой 📍\n(геолокация используется только для этого запроса и не сохраняется)',
      requestLocationKeyboard()
    );
  };

  bot.command('nearby', trigger);
  bot.hears('📍 Рядом со мной', trigger);
  bot.hears('⬅️ Назад', (ctx) => ctx.reply('Главное меню', mainMenu()));

  bot.on('location', async (ctx) => {
    const { latitude, longitude } = ctx.message.location;
    const places = await repo.nearbyPlaces({ lat: latitude, lng: longitude, radiusKm: config.defaultRadiusKm });

    if (places.length === 0) {
      await ctx.reply('Пока здесь тихо 👀 Попробуй увеличить радиус или загляни в «Новинки».', mainMenu());
      return;
    }

    await ctx.reply(`Нашёл ${places.length} мест(а) в радиусе ${config.defaultRadiusKm} км:`, mainMenu());

    for (const place of places.slice(0, 6)) {
      const text = placeCardText(place, {
        distanceKm: place.distance_km,
        categoryName: place.category_name,
        categoryIcon: place.category_icon,
      });
      const { Markup } = require('telegraf');
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.url('🗺 Маршрут', `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`),
            Markup.button.callback('❤️ Сохранить', `fav:${place.id}`),
          ],
        ]),
      });
    }
  });
}

module.exports = { register };

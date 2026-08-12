const repo = require('../repo');
const { placeCardText } = require('../utils/format');
const { placeCardKeyboard } = require('../keyboards');

/** Sends a place's card to the chat. Returns true if the place existed and was sent. */
async function sendPlaceCard(ctx, placeId, { distanceKm } = {}) {
  const place = await repo.getPlaceById(placeId);
  if (!place || place.status !== 'approved') {
    await ctx.reply('Это место не найдено или ещё не опубликовано.');
    return false;
  }
  const rating = await repo.placeRatingSummary(place.id);
  const user = ctx.from ? await repo.getUserByTelegramId(ctx.from.id) : null;
  const fav = user ? await repo.isFavorite(user.id, place.id) : false;

  const text = placeCardText(place, {
    distanceKm,
    categoryName: place.category_name,
    categoryIcon: place.category_icon,
    avgRating: rating.avg,
    reviewCount: rating.count,
  });

  const keyboard = placeCardKeyboard(place, { isFavorite: fav });

  if (place.photo_file_id) {
    await ctx.replyWithPhoto(place.photo_file_id, { caption: text, parse_mode: 'Markdown', ...keyboard });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  }
  return true;
}

function register(bot) {
  bot.action(/^fav:(\d+)$/, async (ctx) => {
    const placeId = Number(ctx.match[1]);
    const user = await repo.upsertUser(ctx.from);
    const isNowFavorite = await repo.toggleFavorite(user.id, placeId);
    await ctx.answerCbQuery(isNowFavorite ? 'Сохранено в избранное ❤️' : 'Убрано из избранного');

    const place = await repo.getPlaceById(placeId);
    if (place) {
      try {
        await ctx.editMessageReplyMarkup(placeCardKeyboard(place, { isFavorite: isNowFavorite }).reply_markup);
      } catch (e) {
        // message may be a photo caption or unchanged — safe to ignore
      }
    }
  });

  bot.action(/^report:place:(\d+)$/, async (ctx) => {
    const placeId = Number(ctx.match[1]);
    const user = await repo.upsertUser(ctx.from);
    await repo.createReport({ userId: user.id, entityType: 'place', entityId: placeId, reason: 'user_report' });
    await ctx.answerCbQuery('Спасибо, передали модераторам ✅', { show_alert: true });
  });
}

module.exports = { register, sendPlaceCard };

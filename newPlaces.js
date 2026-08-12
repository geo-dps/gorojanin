const repo = require('../repo');
const config = require('../config');
const { ratingInlineKeyboard, reviewTagsInlineKeyboard, adminModerationKeyboard } = require('../keyboards');

// Review drafts are short-lived and keyed by telegram user id — an in-memory
// Map is fine for a single-process MVP bot. For multi-instance deployments,
// move this into session storage (e.g. Postgres-backed telegraf session).
const drafts = new Map();

function register(bot) {
  bot.action(/^review:start:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const placeId = Number(ctx.match[1]);
    drafts.set(ctx.from.id, { placeId, tags: [] });
    await ctx.reply('Как оценишь место?', ratingInlineKeyboard(placeId));
  });

  bot.action(/^review:rate:(\d+):(\d)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const placeId = Number(ctx.match[1]);
    const rating = Number(ctx.match[2]);
    const draft = drafts.get(ctx.from.id) || { placeId, tags: [] };
    draft.rating = rating;
    drafts.set(ctx.from.id, draft);
    await ctx.reply('Отметь, что подходит (можно несколько):', reviewTagsInlineKeyboard(placeId, draft.tags));
  });

  bot.action(/^review:tag:(\d+):(\w+)$/, async (ctx) => {
    const placeId = Number(ctx.match[1]);
    const tag = ctx.match[2];
    const draft = drafts.get(ctx.from.id);
    if (!draft) {
      await ctx.answerCbQuery('Начни заново с карточки места', { show_alert: true });
      return;
    }
    if (draft.tags.includes(tag)) {
      draft.tags = draft.tags.filter((t) => t !== tag);
    } else {
      draft.tags.push(tag);
    }
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageReplyMarkup(reviewTagsInlineKeyboard(placeId, draft.tags).reply_markup);
    } catch (e) {
      // ignore
    }
  });

  bot.action(/^review:tagsdone:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session = ctx.session || {};
    ctx.session.awaitingReviewText = true;
    await ctx.reply('Хочешь добавить текст к отзыву? Напиши его сообщением, или пришли "-" чтобы пропустить.');
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session || !ctx.session.awaitingReviewText) return next();
    const draft = drafts.get(ctx.from.id);
    if (!draft || !draft.rating) {
      ctx.session.awaitingReviewText = false;
      return next();
    }

    ctx.session.awaitingReviewText = false;
    const text = ctx.message.text.trim();
    const user = await repo.upsertUser(ctx.from);

    const review = await repo.createPendingReview({
      placeId: draft.placeId,
      userId: user.id,
      rating: draft.rating,
      text: text === '-' ? null : text,
      tags: draft.tags,
    });

    drafts.delete(ctx.from.id);
    await ctx.reply('Спасибо за отзыв! Он появится на карточке места после модерации ✅');

    for (const adminId of config.adminIds) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          `📝 Новый отзыв на модерации (★${review.rating}) для места #${draft.placeId}`,
          adminModerationKeyboard('review', review.id)
        );
      } catch (e) {
        // ignore
      }
    }
  });
}

module.exports = { register };

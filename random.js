const repo = require('../repo');
const config = require('../config');
const { adminModerationKeyboard } = require('../keyboards');

async function requireAdmin(ctx) {
  const ok = await repo.isAdmin(ctx.from.id, config.adminIds);
  if (!ok) {
    await ctx.reply('Эта команда доступна только модераторам.');
    return false;
  }
  return true;
}

function register(bot) {
  bot.command('pending', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const [places, reviews, events] = await Promise.all([
      repo.pendingPlaces(20),
      repo.pendingReviews(20),
      repo.pendingEvents(20),
    ]);

    if (places.length === 0 && reviews.length === 0 && events.length === 0) {
      await ctx.reply('Очередь модерации пуста ✅');
      return;
    }

    await ctx.reply(
      `🗂 На модерации:\n📍 Мест: ${places.length}\n📝 Отзывов: ${reviews.length}\n🎵 Событий: ${events.length}`
    );

    for (const p of places) {
      await ctx.reply(
        `📍 *${escapeMd(p.name)}*\nКатегория: ${p.category_name || '—'}\nАдрес: ${escapeMd(p.address || '—')}\nID: ${p.id}`,
        { parse_mode: 'Markdown', ...adminModerationKeyboard('place', p.id) }
      );
    }
    for (const r of reviews) {
      await ctx.reply(
        `📝 Отзыв ★${r.rating} на «${escapeMd(r.place_name)}»\n${r.text ? escapeMd(r.text) : '(без текста)'}\nID: ${r.id}`,
        { parse_mode: 'Markdown', ...adminModerationKeyboard('review', r.id) }
      );
    }
    for (const e of events) {
      await ctx.reply(`🎵 *${escapeMd(e.name)}*\nID: ${e.id}`, {
        parse_mode: 'Markdown',
        ...adminModerationKeyboard('event', e.id),
      });
    }
  });

  bot.action(/^admin:(place|review|event):(approve|reject):(\d+)$/, async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      await ctx.answerCbQuery('Недостаточно прав', { show_alert: true });
      return;
    }
    const [, entityType, decision, idStr] = ctx.match;
    const id = Number(idStr);
    const status = decision === 'approve' ? 'approved' : 'rejected';

    if (entityType === 'place') await repo.setPlaceStatus(id, status);
    if (entityType === 'review') await repo.setReviewStatus(id, status);
    if (entityType === 'event') await repo.setEventStatus(id, status);

    await repo.logAdminAction({
      adminTelegramId: ctx.from.id,
      action: `${entityType}_${status}`,
      entityType,
      entityId: id,
    });

    await ctx.answerCbQuery(status === 'approved' ? 'Одобрено ✅' : 'Отклонено ❌');
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch (e) {
      // ignore
    }
    await ctx.reply(`${entityType} #${id} → ${status}`);
  });
}

function escapeMd(text) {
  return String(text || '').replace(/([_*`[\]])/g, '\\$1');
}

module.exports = { register };

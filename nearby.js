const repo = require('../repo');
const { eventCardText } = require('../utils/format');
const { Markup } = require('telegraf');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeFor(kind) {
  const now = new Date();
  if (kind === 'today') return { fromDate: now, toDate: endOfDay(now) };
  if (kind === 'tomorrow') {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return { fromDate: startOfDay(t), toDate: endOfDay(t) };
  }
  if (kind === 'weekend') {
    const t = new Date(now);
    const day = t.getDay(); // 0 Sun .. 6 Sat
    const daysToSat = (6 - day + 7) % 7;
    const sat = new Date(t);
    sat.setDate(t.getDate() + daysToSat);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    return { fromDate: startOfDay(sat), toDate: endOfDay(sun) };
  }
  // week
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);
  return { fromDate: now, toDate: weekLater };
}

function eventsFilterKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Сегодня', 'events:today'),
      Markup.button.callback('Завтра', 'events:tomorrow'),
    ],
    [
      Markup.button.callback('Выходные', 'events:weekend'),
      Markup.button.callback('Эта неделя', 'events:week'),
    ],
  ]);
}

async function showEvents(ctx, kind) {
  const { fromDate, toDate } = rangeFor(kind);
  const events = await repo.upcomingEvents({ fromDate, toDate, limit: 8 });
  if (events.length === 0) {
    await ctx.reply('Сегодня рядом ничего не нашли. Попробовать другой период? 👀', eventsFilterKeyboard());
    return;
  }
  for (const event of events) {
    const text = eventCardText(event, { categoryName: event.category_name, categoryIcon: event.category_icon });
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❤️ Сохранить', `evfav:${event.id}`)],
        ...(event.url ? [[Markup.button.url('🔗 Подробнее', event.url)]] : []),
      ]),
    });
  }
}

async function sendEventCard(ctx, eventId) {
  const event = await repo.getEventById(eventId);
  if (!event || event.status !== 'approved') {
    await ctx.reply('Это событие не найдено или ещё не опубликовано.');
    return false;
  }
  const text = eventCardText(event, { categoryName: event.category_name, categoryIcon: event.category_icon });
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('❤️ Сохранить', `evfav:${event.id}`)],
      ...(event.url ? [[Markup.button.url('🔗 Подробнее', event.url)]] : []),
    ]),
  });
  return true;
}

function register(bot) {
  const trigger = (ctx) => ctx.reply('🎵 Что смотрим?', eventsFilterKeyboard());
  bot.command('events', trigger);
  bot.hears('🎵 События', trigger);

  bot.action(/^events:(today|tomorrow|weekend|week)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showEvents(ctx, ctx.match[1]);
  });

  bot.action(/^evfav:(\d+)$/, async (ctx) => {
    const repoUser = await repo.upsertUser(ctx.from);
    const { query } = require('../db');
    const eventId = Number(ctx.match[1]);
    const { rows } = await query('SELECT 1 FROM event_favorites WHERE user_id=$1 AND event_id=$2', [repoUser.id, eventId]);
    if (rows.length > 0) {
      await query('DELETE FROM event_favorites WHERE user_id=$1 AND event_id=$2', [repoUser.id, eventId]);
      await ctx.answerCbQuery('Убрано из избранного');
    } else {
      await query('INSERT INTO event_favorites (user_id, event_id) VALUES ($1,$2)', [repoUser.id, eventId]);
      await ctx.answerCbQuery('Сохранено ❤️');
    }
  });
}

module.exports = { register, sendEventCard };

const repo = require('../repo');
const config = require('../config');
const { mainMenu } = require('../keyboards');
const { sendPlaceCard } = require('./placeCard');
const { sendEventCard } = require('./events');

function register(bot) {
  bot.start(async (ctx) => {
    await repo.upsertUser(ctx.from);

    const payload = ctx.startPayload; // e.g. "place_12", "event_5"
    if (payload && payload.startsWith('place_')) {
      const id = Number(payload.replace('place_', ''));
      if (Number.isFinite(id)) {
        const sent = await sendPlaceCard(ctx, id);
        if (sent) return;
      }
    }
    if (payload && payload.startsWith('event_')) {
      const id = Number(payload.replace('event_', ''));
      if (Number.isFinite(id)) {
        const sent = await sendEventCard(ctx, id);
        if (sent) return;
      }
    }

    await ctx.reply(
      `Добро пожаловать в *${config.cityName} Сейчас* 👋\n\n` +
        'Покажем, куда сходить, что посмотреть и что происходит сегодня.\n\n' +
        'Выбирай раздел на клавиатуре ниже или сразу отправь мне геолокацию, чтобы увидеть места рядом.',
      { parse_mode: 'Markdown', ...mainMenu() }
    );
  });

  bot.hears('ℹ️ Помощь', (ctx) => ctx.reply(helpText(), { parse_mode: 'Markdown' }));
  bot.help((ctx) => ctx.reply(helpText(), { parse_mode: 'Markdown' }));
}

function helpText() {
  return (
    '*Команды*\n' +
    '/start — главное меню\n' +
    '/nearby — места рядом (нужна геолокация)\n' +
    '/events — что происходит сегодня и на неделе\n' +
    '/new — новинки города\n' +
    '/favorites — избранное\n' +
    '/random — «Удиви меня» 🎲\n' +
    '/add — добавить место (уйдёт на модерацию)\n' +
    '/profile — профиль и статистика\n' +
    '/settings — настройки уведомлений\n\n' +
    'Можно также просто написать текстом, например: «недорогой бургер» или «где посидеть с ноутбуком» — я поищу по названию и описанию мест.'
  );
}

module.exports = { register, helpText };

const repo = require('../repo');

const LEVELS = [
  { min: 0, name: 'Новичок' },
  { min: 5, name: 'Житель' },
  { min: 15, name: 'Исследователь' },
  { min: 40, name: 'Городской гид' },
  { min: 100, name: 'Local Expert' },
];

function levelFor(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.min) current = lvl;
  }
  return current.name;
}

function register(bot) {
  const trigger = async (ctx) => {
    const user = await repo.upsertUser(ctx.from);
    const stats = await repo.userStats(ctx.from.id);
    const xp = user.xp || 0;

    const joined = new Date(user.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

    await ctx.reply(
      `👤 *${escapeMd(ctx.from.first_name || 'Профиль')}*\n\n` +
        `Уровень: ${levelFor(xp)} (${xp} XP)\n` +
        `📝 Отзывов: ${stats.review_count}\n` +
        `📍 Добавлено мест: ${stats.places_added}\n` +
        `❤️ В избранном: ${stats.favorites_count}\n\n` +
        `С нами с: ${joined}`,
      { parse_mode: 'Markdown' }
    );
  };

  bot.command('profile', trigger);
  bot.hears('👤 Профиль', trigger);
}

function escapeMd(text) {
  return String(text).replace(/([_*`[\]])/g, '\\$1');
}

module.exports = { register };

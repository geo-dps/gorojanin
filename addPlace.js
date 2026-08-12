const repo = require('../repo');
const { query } = require('../db');
const { Markup } = require('telegraf');

function keyboardFor(user) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${user.notifications_daily ? '🔔' : '🔕'} Ежедневная подборка`,
        'settings:toggle:daily'
      ),
    ],
    [
      Markup.button.callback(
        `${user.notifications_events ? '🔔' : '🔕'} Уведомления о событиях`,
        'settings:toggle:events'
      ),
    ],
  ]);
}

function register(bot) {
  const trigger = async (ctx) => {
    const user = await repo.upsertUser(ctx.from);
    await ctx.reply('⚙️ Настройки уведомлений:', keyboardFor(user));
  };

  bot.command('settings', trigger);

  bot.action(/^settings:toggle:(daily|events)$/, async (ctx) => {
    const user = await repo.upsertUser(ctx.from);
    const field = ctx.match[1] === 'daily' ? 'notifications_daily' : 'notifications_events';
    const newValue = !user[field];
    await query(`UPDATE users SET ${field} = $1 WHERE id = $2`, [newValue, user.id]);
    const updated = { ...user, [field]: newValue };
    await ctx.answerCbQuery(newValue ? 'Включено' : 'Выключено');
    try {
      await ctx.editMessageReplyMarkup(keyboardFor(updated).reply_markup);
    } catch (e) {
      // ignore if unchanged
    }
  });
}

module.exports = { register };

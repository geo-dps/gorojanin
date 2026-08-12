const { Scenes, Markup } = require('telegraf');
const repo = require('../repo');
const config = require('../config');
const { categoriesInlineKeyboard, priceInlineKeyboard, mainMenu } = require('../keyboards');

const STEP_CANCEL_HINT = '\n\nОтправь /cancel, чтобы отменить.';

const addPlaceScene = new Scenes.BaseScene('ADD_PLACE');

addPlaceScene.enter(async (ctx) => {
  ctx.scene.state.draft = { step: 'name' };
  await ctx.reply('➕ Добавляем новое место.\n\nКак оно называется?' + STEP_CANCEL_HINT);
});

addPlaceScene.command('cancel', async (ctx) => {
  await ctx.reply('Добавление отменено.', mainMenu());
  return ctx.scene.leave();
});

addPlaceScene.on('text', async (ctx) => {
  const draft = ctx.scene.state.draft;

  if (!draft.step || draft.step === 'name') {
    draft.name = ctx.message.text.trim();
    draft.step = 'category';
    const categories = await repo.listCategories();
    await ctx.reply('Отлично! Какая категория подходит лучше всего?', categoriesInlineKeyboard(categories, { prefix: 'addcat' }));
    return;
  }

  if (draft.step === 'category') {
    await ctx.reply('Выбери категорию кнопкой выше 👆');
    return;
  }

  if (draft.step === 'address') {
    draft.address = ctx.message.text.trim();
    draft.step = 'price';
    await ctx.reply(
      'Записал 👍 Если хочешь, пришли ещё точную геолокацию (📎 → Location) — это необязательно.\n\n' +
        'А пока выбери ценовой уровень:',
      priceInlineKeyboard('addprice')
    );
    return;
  }

  if (draft.step === 'price') {
    await ctx.reply('Выбери ценовой уровень кнопкой выше 👆');
    return;
  }

  if (draft.step === 'description') {
    const text = ctx.message.text.trim();
    draft.description = text.toLowerCase() === 'пропустить' ? '' : text;
    draft.step = 'confirm';
    await finalizeConfirmation(ctx);
    return;
  }
});

addPlaceScene.on('location', async (ctx) => {
  const draft = ctx.scene.state.draft;
  if (!draft.step || draft.step === 'name' || draft.step === 'category') {
    await ctx.reply('Сначала расскажи название и категорию текстом, геолокацию добавим чуть позже 🙂');
    return;
  }
  draft.latitude = ctx.message.location.latitude;
  draft.longitude = ctx.message.location.longitude;
  await ctx.reply('Геолокация сохранена 📍');
});

addPlaceScene.action(/^addcat:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const slug = ctx.match[1];
  const category = await repo.getCategoryBySlug(slug);
  if (!category) return;
  const draft = ctx.scene.state.draft;
  draft.categoryId = category.id;
  draft.categorySlug = slug;
  draft.step = 'address';
  await ctx.reply(`Категория: ${category.icon || ''} ${category.name}\n\nКакой адрес у места?`);
});

addPlaceScene.action(/^addprice:(\d)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const draft = ctx.scene.state.draft;
  draft.priceLevel = Number(ctx.match[1]);
  draft.step = 'description';
  await ctx.reply('Коротко опиши место (или напиши "пропустить"):');
});

async function finalizeConfirmation(ctx) {
  const draft = ctx.scene.state.draft;
  const summary =
    `Проверь, всё верно?\n\n` +
    `*${escapeMd(draft.name)}*\n` +
    `Адрес: ${escapeMd(draft.address || '—')}\n` +
    `Цена: ${'€'.repeat(draft.priceLevel || 1)}\n` +
    (draft.description ? `Описание: ${escapeMd(draft.description)}\n` : '');

  await ctx.reply(summary, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Отправить на модерацию', 'addplace:confirm')],
      [Markup.button.callback('❌ Отмена', 'addplace:cancel')],
    ]),
  });
}

addPlaceScene.action('addplace:cancel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('Добавление отменено.');
  return ctx.scene.leave();
});

addPlaceScene.action('addplace:confirm', async (ctx) => {
  await ctx.answerCbQuery();
  const draft = ctx.scene.state.draft;
  const user = await repo.upsertUser(ctx.from);

  const place = await repo.createPendingPlace({
    name: draft.name,
    description: draft.description,
    categoryId: draft.categoryId,
    latitude: draft.latitude,
    longitude: draft.longitude,
    address: draft.address,
    priceLevel: draft.priceLevel,
    addedBy: user.telegram_id,
  });

  await ctx.editMessageText('Спасибо! Место отправлено на модерацию ✅\nКак только его проверят — оно появится на карте.');
  await ctx.scene.leave();
  await ctx.reply('Главное меню', mainMenu());

  await notifyAdmins(ctx, place);
});

async function notifyAdmins(ctx, place) {
  const { adminModerationKeyboard } = require('../keyboards');
  for (const adminId of config.adminIds) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `🆕 Новое место на модерации: *${escapeMd(place.name)}*\nАдрес: ${escapeMd(place.address || '—')}`,
        { parse_mode: 'Markdown', ...adminModerationKeyboard('place', place.id) }
      );
    } catch (e) {
      // admin may not have started the bot yet — ignore
    }
  }
}

function escapeMd(text) {
  return String(text || '').replace(/([_*`[\]])/g, '\\$1');
}

function register(bot, stage) {
  bot.command('add', (ctx) => ctx.scene.enter('ADD_PLACE'));
  bot.hears('➕ Добавить место', (ctx) => ctx.scene.enter('ADD_PLACE'));
}

module.exports = { addPlaceScene, register };

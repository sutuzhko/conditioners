// Мок-хранилище CRM — ТулаКлимат. v3: несколько кондиционеров в заказе, чеклист выезда, документы, оплата на месте, история заказов.
export const CRM_KEY = 'tk-crm-v3';

export function uid(p) { return p + Math.random().toString(36).slice(2, 8); }
export function today() { return new Date().toISOString().slice(0, 10); }

const seed = {
  orderSeq: 1060,
  owner: { name: 'Алексей (владелец)', login: 'admin', phone: '+7 (4872) 00-00-00' },
  calSync: { google: false, yandex: false },
  installers: [
    { id: 'i1', login: 'sokolov', name: 'Дмитрий Соколов', phone: '+7 (910) 155-24-68', since: '2024-04-10', active: true,
      notes: [{ date: '2026-07-15', text: 'Аккуратный монтаж, клиенты хвалят. Можно доверять сложные объекты.' }] },
    { id: 'i2', login: 'belov', name: 'Артём Белов', phone: '+7 (953) 442-18-03', since: '2025-06-02', active: true, notes: [] },
  ],
  clients: [
    { id: 'c1', name: 'Марина Ковалёва', phone: '+7 (905) 620-14-77', address: 'Тула, ул. Демонстрации, 8, кв. 12', note: 'Звонить после 18:00', createdAt: '2026-07-02',
      units: [{ id: 'u1', model: 'Сплит-система 09', date: '2026-07-14', orderId: 'o1', photo: '' }] },
    { id: 'c2', name: 'Игорь Прохоров', phone: '+7 (920) 741-90-35', address: 'Тула, пр-т Ленина, 102, кв. 45', note: '', createdAt: '2026-06-18', units: [] },
    { id: 'c3', name: 'Сергей Лапин', phone: '+7 (960) 214-55-19', address: 'Тула, ул. Болдина, 41', note: 'Офис, 2 помещения', createdAt: '2026-06-20', units: [] },
    { id: 'c4', name: 'Анна Дроздова', phone: '+7 (953) 118-30-42', address: 'Тула, ул. Пузакова, 18, кв. 64', note: 'Из обращения — двушка, 2 сплита', createdAt: '2026-08-23', units: [] },
  ],
  leads: [
    { id: 'l1', name: 'Ольга', phone: '+7 (487) 231-08-90', topic: 'Консультация', when: 'Сегодня до 19:00', msg: 'Какой кондиционер подойдёт для спальни 16 м²?', status: 'new', note: '', date: '2026-08-24' },
    { id: 'l2', name: 'Виктор', phone: '+7 (910) 077-45-12', topic: 'ТО и чистка', when: 'Завтра утром', msg: '', status: 'new', note: '', date: '2026-08-23' },
    { id: 'l3', name: 'Анна', phone: '+7 (953) 118-30-42', topic: 'Монтаж и установка', when: '', msg: 'Двушка, нужен монтаж двух сплитов.', status: 'inwork', note: 'Создан заказ № 1059', date: '2026-08-22' },
  ],
  orders: [
    { id: 'o5', num: '№ 1059', type: 'Монтаж', clientId: 'c4', installerId: 'i1', status: 'assigned', date: '2026-08-27', time: '10:00',
      address: 'Тула, ул. Пузакова, 18, кв. 64', intercom: '2 подъезд, домофон 64К', phone2: '', duration: 6, floor: 5, heightWorks: false,
      units: [
        { id: 'u51', model: 'Сплит-система 09', source: 'ours', trassa: 4, diam: '1/4 – 3/8', shtrob: true },
        { id: 'u52', model: 'Сплит-система 07 (куплен клиентом)', source: 'client', trassa: 7, diam: '1/4 – 3/8', shtrob: false },
      ],
      payment: 'cash_installer', price: 92800, fee: 13000,
      extraWork: 'Короб 3 м в коридоре', comment: 'Спальня — штробление, гостиная — трасса в коробе. Кондиционер для гостиной клиент купил сам, наш только 09.', report: '',
      checklist: [], docs: [{ id: 'd51', name: 'Договор № 1059.pdf', kind: 'Договор', size: '218 КБ', src: '', date: '2026-08-22' }],
      photosBefore: [], photosAfter: [], ownerNote: 'Клиент платит наличными монтажнику — 92 800 ₽, напомнить Дмитрию.', penalty: null,
      history: [{ date: '2026-08-22', text: 'Назначен монтажник: Дмитрий Соколов' }, { date: '2026-08-22', text: 'Заказ создан из обращения' }] },
    { id: 'o2', num: '№ 1057', type: 'Монтаж', clientId: 'c2', installerId: 'i1', status: 'assigned', date: '2026-08-25', time: '09:30',
      address: 'Тула, пр-т Ленина, 102, кв. 45', intercom: '45К', phone2: '', duration: 4, floor: 12, heightWorks: true,
      units: [{ id: 'u21', model: 'Сплит-система 12', source: 'ours', trassa: 6, diam: '1/4 – 3/8', shtrob: false }],
      payment: 'company', price: 52400, fee: 7000,
      extraWork: '', comment: '12 этаж — высотные работы согласованы. Кронштейны наши.', report: '',
      checklist: [
        { id: 'k21', text: 'Перфоратор, бур 45–50 мм', done: true },
        { id: 'k22', text: 'Вакуумный насос и манометрический коллектор', done: true },
        { id: 'k23', text: 'Трасса 6 м, диаметр 1/4 – 3/8', done: false },
        { id: 'k24', text: 'Кронштейны, крепёж, дренажный шланг', done: false },
        { id: 'k25', text: 'Страховка и высотное снаряжение', done: false },
      ],
      docs: [],
      photosBefore: [], photosAfter: [], ownerNote: 'Проверить длину трассы на месте — клиент мерил сам.', penalty: null,
      history: [{ date: '2026-08-20', text: 'Назначен монтажник: Дмитрий Соколов' }, { date: '2026-08-19', text: 'Заказ создан из обращения' }] },
    { id: 'o3', num: '№ 1058', type: 'ТО', clientId: 'c1', installerId: '', status: 'new', date: '2026-08-28', time: '14:00',
      address: 'Тула, ул. Демонстрации, 8, кв. 12', intercom: '12К', phone2: '', duration: 1.5, floor: 3, heightWorks: false,
      units: [{ id: 'u31', model: 'Сплит-система 09', source: 'ours', trassa: 0, diam: '', shtrob: false }],
      payment: 'company', price: 3500, fee: 1200,
      extraWork: '', comment: 'Чистка фильтров и проверка давления — год после установки.', report: '',
      checklist: [], docs: [],
      photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [] },
    { id: 'o4', num: '№ 1052', type: 'Ремонт', clientId: 'c3', installerId: 'i2', status: 'inwork', date: '2026-08-24', time: '12:00',
      address: 'Тула, ул. Болдина, 41', intercom: 'офис, вход со двора', phone2: '', duration: 2, floor: 2, heightWorks: false,
      units: [{ id: 'u41', model: 'Кассетная сплит-система (чужой монтаж)', source: 'client', trassa: 0, diam: '', shtrob: false }],
      payment: 'cash_installer', price: 8000, fee: 3000,
      extraWork: '', comment: 'Не холодит, вероятна утечка. Взять течеискатель.', report: '',
      checklist: [], docs: [],
      photosBefore: [], photosAfter: [], ownerNote: '', penalty: { sum: 500, reason: 'Опоздание на 40 минут, 24.08' },
      history: [{ date: '2026-08-24', text: 'Монтажник выехал на объект' }] },
    { id: 'o1', num: '№ 1041', type: 'Монтаж', clientId: 'c1', installerId: 'i1', status: 'done', date: '2026-07-14', time: '10:00',
      address: 'Тула, ул. Демонстрации, 8, кв. 12', intercom: '12К', phone2: '', duration: 4, floor: 3, heightWorks: false,
      units: [{ id: 'u11', model: 'Сплит-система 09', source: 'ours', trassa: 4, diam: '1/4 – 3/8', shtrob: true }],
      payment: 'company', price: 45000, fee: 6500,
      extraWork: 'Короб 4 м, кронштейны', comment: 'Трасса в коробе, штробление по кухне.', report: 'Установили за 3,5 часа. Опрессовка и вакуумирование в норме.', resultAt: '2026-07-14',
      checklist: [],
      docs: [
        { id: 'd11', name: 'Договор № 1041.pdf', kind: 'Договор', size: '214 КБ', src: '', date: '2026-07-10' },
        { id: 'd12', name: 'Гарантийный талон.pdf', kind: 'Гарантийный талон', size: '96 КБ', src: '', date: '2026-07-14' },
        { id: 'd13', name: 'Акт выполненных работ.pdf', kind: 'Акт работ', size: '138 КБ', src: '', date: '2026-07-14' },
      ],
      photosBefore: [], photosAfter: [], ownerNote: '', penalty: null,
      history: [{ date: '2026-07-14', text: 'Выполнен, отчёт приложен' }, { date: '2026-07-10', text: 'Назначен монтажник: Дмитрий Соколов' }] },
    { id: 'o6', num: '№ 1050', type: 'Монтаж', clientId: 'c3', installerId: 'i2', status: 'done', date: '2026-08-02', time: '09:00',
      address: 'Тула, ул. Болдина, 41', intercom: '', phone2: '', duration: 5, floor: 2, heightWorks: false,
      units: [{ id: 'u61', model: 'Сплит-система 12 (офис)', source: 'ours', trassa: 5, diam: '1/4 – 3/8', shtrob: false }],
      payment: 'company', price: 47000, fee: 6500, extraWork: '', comment: '', report: 'Штатный монтаж, трасса в коробе.', resultAt: '2026-08-02',
      checklist: [], docs: [], photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [{ date: '2026-08-02', text: 'Выполнен' }] },
    { id: 'o7', num: '№ 1048', type: 'ТО', clientId: 'c2', installerId: 'i1', status: 'done', date: '2026-07-28', time: '11:00',
      address: 'Тула, пр-т Ленина, 102, кв. 45', intercom: '', phone2: '', duration: 1, floor: 12, heightWorks: false,
      units: [{ id: 'u71', model: 'Сплит-система 12', source: 'ours', trassa: 0, diam: '', shtrob: false }],
      payment: 'company', price: 3500, fee: 1200, extraWork: '', comment: '', report: 'Чистка, давление в норме.', resultAt: '2026-07-28',
      checklist: [], docs: [], photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [{ date: '2026-07-28', text: 'Выполнен' }] },
    { id: 'o8', num: '№ 1046', type: 'Монтаж', clientId: 'c2', installerId: 'i1', status: 'done', date: '2026-07-20', time: '10:00',
      address: 'Тула, пр-т Ленина, 102, кв. 45', intercom: '', phone2: '', duration: 3, floor: 12, heightWorks: true,
      units: [{ id: 'u81', model: 'Сплит-система 07 (куплен клиентом)', source: 'client', trassa: 3, diam: '1/4 – 3/8', shtrob: false }],
      payment: 'cash_installer', price: 14900, fee: 6000, extraWork: '', comment: 'Только монтаж, кондиционер клиента.', report: 'Смонтирован на кухне.', resultAt: '2026-07-20',
      checklist: [], docs: [], photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [{ date: '2026-07-20', text: 'Выполнен' }] },
    { id: 'o9', num: '№ 1044', type: 'Ремонт', clientId: 'c3', installerId: 'i2', status: 'done', date: '2026-07-08', time: '15:00',
      address: 'Тула, ул. Болдина, 41', intercom: '', phone2: '', duration: 2, floor: 2, heightWorks: false,
      units: [{ id: 'u91', model: 'Холодильная витрина Polair', source: 'client', equip: 'Холодильник', trassa: 0, diam: '', shtrob: false }],
      payment: 'company', price: 6500, fee: 2500, extraWork: '', comment: '', report: 'Заменён дренажный насос.', resultAt: '2026-07-08',
      checklist: [], docs: [], photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [{ date: '2026-07-08', text: 'Выполнен' }] },
    { id: 'o10', num: '№ 1043', type: 'Монтаж', clientId: 'c3', installerId: 'i1', status: 'done', date: '2026-07-05', time: '09:30',
      address: 'Тула, ул. Болдина, 41', intercom: '', phone2: '', duration: 4, floor: 2, heightWorks: false,
      units: [{ id: 'u101', model: 'Сплит-система 09 (офис)', source: 'ours', trassa: 4, diam: '1/4 – 3/8', shtrob: true }],
      payment: 'company', price: 45000, fee: 6500, extraWork: '', comment: '', report: 'Штробление по кабинету, всё штатно.', resultAt: '2026-07-05',
      checklist: [], docs: [], photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [{ date: '2026-07-05', text: 'Выполнен' }] },
    { id: 'o11', num: '№ 1040', type: 'ТО', clientId: 'c3', installerId: 'i1', status: 'done', date: '2026-06-24', time: '13:00',
      address: 'Тула, ул. Болдина, 41', intercom: '', phone2: '', duration: 2, floor: 2, heightWorks: false,
      units: [{ id: 'u111', model: 'Две сплит-системы (офис)', source: 'ours', trassa: 0, diam: '', shtrob: false }],
      payment: 'company', price: 7000, fee: 2400, extraWork: '', comment: '', report: 'Чистка двух блоков.', resultAt: '2026-06-24',
      checklist: [], docs: [], photosBefore: [], photosAfter: [], ownerNote: '', penalty: null, history: [{ date: '2026-06-24', text: 'Выполнен' }] },
  ],
  events: [
    { id: 'e1', date: '2026-08-26', time: '11:00', kind: 'Замер', title: 'Анна — двушка, 2 сплита' },
    { id: 'e2', date: '2026-08-24', time: '17:00', kind: 'Звонок', title: 'Ольга — консультация по спальне' },
  ],
  notify: { leadTg: true, reviewTg: true, orderTg: true, digest: false, chatId: '@tulaklimat_admin' },
};

// Чеклист «что взять с собой» — собирается из данных наряда
export function defaultChecklist(o) {
  const items = [];
  const add = (t) => items.push({ id: uid('k'), text: t, done: false });
  if (o.type === 'Монтаж') {
    add('Перфоратор, бур 45–50 мм');
    add('Вакуумный насос и манометрический коллектор');
    add('Труборез, вальцовка, динамометрические ключи');
    (o.units || []).forEach((u, i) => add('Трасса ' + (u.trassa || '?') + ' м, диаметр ' + (u.diam || '—') + ((o.units || []).length > 1 ? ' — блок ' + (i + 1) : '')));
    add('Кронштейны, крепёж, дренажный шланг');
    if ((o.units || []).some((u) => u.shtrob)) add('Штроборез и строительный пылесос');
  }
  if (o.type === 'ТО') { add('Парогенератор и чистящее средство'); add('Манометры — проверить давление'); add('Сменные фильтры'); }
  if (o.type === 'Ремонт') { add('Течеискатель'); add('Фреон (марку уточнить у владельца)'); add('Запасные дренажные помпы и клапаны'); }
  if (o.heightWorks) add('Страховка и высотное снаряжение');
  if (o.payment === 'cash_installer') add('Принять оплату от клиента: ' + (o.price ? Math.round(o.price).toLocaleString('ru-RU') + ' ₽' : 'сумма в наряде'));
  add('Договор и гарантийный талон (распечатать)');
  return items;
}

// миграция старых записей к структуре v3
function migrate(db) {
  (db.orders || []).forEach((o) => {
    if (!o.units || !o.units.length) o.units = [{ id: uid('u'), model: o.model || '', source: 'ours', trassa: o.trassa || 0, diam: o.diam || '', shtrob: !!o.shtrob }];
    (o.units || []).forEach((u) => { if (!u.equip) u.equip = 'Кондиционер'; });
    if (!o.checklist) o.checklist = [];
    if (!o.docs) o.docs = [];
    if (!o.payment) o.payment = 'company';
    if (o.intercom === undefined) o.intercom = '';
    if (o.phone2 === undefined) o.phone2 = '';
    if (o.duration === undefined) o.duration = 0;
  });
  if (!db.calSync) db.calSync = { google: false, yandex: false };
  return db;
}

export function loadCrm() {
  try { const raw = localStorage.getItem(CRM_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) {}
  return migrate(JSON.parse(JSON.stringify(seed)));
}
export function saveCrm(db) { try { localStorage.setItem(CRM_KEY, JSON.stringify(db)); } catch (e) {} }
export function fmtDate(iso) {
  if (!iso) return '';
  const m = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  const y = d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear();
  return d.getDate() + ' ' + m[d.getMonth()] + y;
}

-- Справочник видов работ (ADR-343, issue #829).
--
-- Одно понятие вместо трёх: тема обращения, вид дела в календаре и тип наряда
-- сводятся в справочник, которым владелец управляет из настроек. Эта миграция
-- заводит справочник и переводит на него календарь; наряды и заявки переезжают
-- следующими фазами.
--
-- 🔴 Единственные записи, которых миграция касается, — шесть дел с видами
-- INSTALL и SERVICE (ADR-359, решение владельца). Всё остальное она только
-- дополняет: база дев-окружения одна на все рабочие деревья, и правка чужих
-- строк отсюда означала бы правку чужой работы.

-- 1. Краски. Перечислением, а не строкой: набор растёт только вместе с
--    токенами CSS, то есть правкой кода, и база обязана отклонять краску,
--    для которой пары «фон + текст» не существует.
CREATE TYPE "WorkTypeTone" AS ENUM ('ACCENT', 'INFO', 'OK', 'WARN', 'SALE', 'ERROR', 'NEUTRAL');

CREATE TABLE "WorkType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tone" "WorkTypeTone" NOT NULL,
    "icon" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "onSite" BOOLEAN NOT NULL DEFAULT false,
    "dayLong" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkType_code_key" ON "WorkType"("code");
CREATE INDEX "WorkType_active_sort_idx" ON "WorkType"("active", "sort");

-- 2. Нынешние виды переезжают в справочник как есть: краски и значки те же,
--    что стояли в `KIND_LOOK` и `ORDER_LOOK`, — эта миграция меняет место
--    хранения, а не вид календаря.
--
--    🔴 Идентификатор произведён из кода, а не случаен. Справочник заводят
--    и миграция, и сид, и оба обязаны дать одну и ту же строку: на случайных
--    идентификаторах повторный накат на заполненную базу завёл бы вторую
--    «Установку», а сценарии не могли бы сослаться на вид работ, не запросив
--    его сначала.
--
--    Порядок — тот, в каком виды дел стояли в поле «Что за дело» до переезда:
--    у владельца ничего не переставляется без его ведома. «Ремонт» встаёт
--    рядом с «Обслуживанием» — он приходит из типов наряда и в поле дела
--    прежде не предлагался.
--
--    «Предлагать на сайте» стоит у того, что посетитель заказывает словами:
--    замер, монтаж, обслуживание и ремонт. Звонок, встреча и заметка —
--    внутренняя кухня, в форме заявки им делать нечего.
INSERT INTO "WorkType" ("id", "code", "title", "tone", "icon", "sort", "onSite", "dayLong", "active", "updatedAt")
VALUES
    ('wt_call',    'call',    'Звонок',        'ACCENT',  'phone',     10, false, false, true, CURRENT_TIMESTAMP),
    ('wt_measure', 'measure', 'Замер',         'INFO',    'map-point', 20, true,  false, true, CURRENT_TIMESTAMP),
    ('wt_install', 'install', 'Монтаж',        'OK',      'wrench',    30, true,  false, true, CURRENT_TIMESTAMP),
    ('wt_service', 'service', 'Обслуживание',  'WARN',    'settings',  40, true,  false, true, CURRENT_TIMESTAMP),
    ('wt_repair',  'repair',  'Ремонт',        'ERROR',   'pulse',     50, true,  false, true, CURRENT_TIMESTAMP),
    ('wt_meeting', 'meeting', 'Встреча',       'SALE',    'chat',      60, false, false, true, CURRENT_TIMESTAMP),
    -- 🔴 Заметка висит на дне, а не на часе: до справочника это решала строка
    --    в раскладке календаря, теперь — признак записи.
    ('wt_note',    'note',    'Заметка',       'NEUTRAL', 'bill',      70, false, true,  true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- 3. 🔴 Шесть старых дел с видами «установка» и «обслуживание» удаляются —
--    решение владельца, ADR-359. Это настоящие выезды с адресами, заведённые
--    до появления нарядов; по CRM §5 работа с исполнителем и деньгами
--    сегодня заводилась бы нарядом, а не делом календаря.
--
--    Удаление идёт здесь, а не руками в проде: правка данных на боевой базе
--    мимо `prisma migrate` запрещена (ADR-017), и повторяется она на копии
--    так же, как любая другая.
--
--    Условие по виду, а не по списку номеров: номеров у дел нет, а
--    перечислять шесть cuid'ов значило бы привязать миграцию к одной базе.
--    Отсечки по дате тоже нет: владелец сказал «шесть старых дел удаляет», а
--    не «заведённые до такого-то числа», и выдумывать за него правило хуже,
--    чем исполнить сказанное.
--
--    🔴 Отсюда и предохранитель по числу. Форма дела эти виды сегодня
--    предлагает, значит между написанием миграции и накатом на бой их может
--    стать больше шести — и уйдут они вместе с остальными. Удаление по
--    решению владельца законно; удаление сверх решённого — нет.
--
--    Порог — те самые шесть из ADR-359, а не «сколько найдётся». Меньше шести
--    законно: часть могли убрать раньше. Больше — значит появилось то, о чём
--    владелец не решал, и накат останавливается, называя число: разобраться с
--    новой записью дешевле, чем узнать о её пропаже через месяц.
--
--    Сообщение идёт исключением, а не `RAISE NOTICE`: движок Prisma не
--    показывает ни NOTICE, ни WARNING — проверено `prisma db execute` с
--    DO-блоком, на выходе только «Script executed successfully», тогда как
--    тот же файл в `psql` печатает обе строки. Отказ же виден: он роняет
--    накат своим текстом. `NOTICE` ниже оставлен для запуска руками через
--    `psql` — там он и читается.
DO $$
DECLARE doomed integer;
BEGIN
    SELECT count(*) INTO doomed FROM "CrmEvent" WHERE "kind" IN ('INSTALL', 'SERVICE');

    IF doomed > 6 THEN
        RAISE EXCEPTION
            'ADR-359: дел с видами INSTALL и SERVICE стало %, а владелец решал судьбу шести. Накат остановлен — удалять сверх решённого молча нельзя. Разберитесь с новыми записями (заведите их нарядами) и повторите выкладку либо поднимите порог в этой миграции с ведома владельца.',
            doomed;
    END IF;

    DELETE FROM "CrmEvent" WHERE "kind" IN ('INSTALL', 'SERVICE');
    RAISE NOTICE 'ADR-359: удалено дел с видами INSTALL и SERVICE: %', doomed;
END $$;

-- 4. Дело переезжает с перечисления на ссылку. Колонка добавляется пустой,
--    заполняется по коду вида и только потом становится обязательной:
--    сделать её `NOT NULL` сразу нельзя — таблица не пуста.
ALTER TABLE "CrmEvent" ADD COLUMN "workTypeId" TEXT;

UPDATE "CrmEvent" AS e
SET "workTypeId" = w."id"
FROM "WorkType" AS w
WHERE w."code" = CASE e."kind"
    WHEN 'CALL'    THEN 'call'
    WHEN 'MEASURE' THEN 'measure'
    WHEN 'MEETING' THEN 'meeting'
    WHEN 'NOTE'    THEN 'note'
END;

-- 🔴 Предохранитель — сама обязательность колонки. Дело без вида работ дальше
--    нечем нарисовать, и молча оставить его нельзя: если хоть одна строка не
--    перевелась, `SET NOT NULL` откажет и вся миграция откатится целиком.
--    Непереведённых быть не может — виды перечислены полностью, а INSTALL и
--    SERVICE удалены выше, — но проверка стоит не на «может», а на «нельзя».
ALTER TABLE "CrmEvent" ALTER COLUMN "workTypeId" SET NOT NULL;

ALTER TABLE "CrmEvent" DROP COLUMN "kind";
DROP TYPE "CrmEventKind";

CREATE INDEX "CrmEvent_workTypeId_idx" ON "CrmEvent"("workTypeId");

ALTER TABLE "CrmEvent"
    ADD CONSTRAINT "CrmEvent_workTypeId_fkey"
    FOREIGN KEY ("workTypeId") REFERENCES "WorkType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

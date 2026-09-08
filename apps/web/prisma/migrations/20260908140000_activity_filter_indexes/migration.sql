-- Индексы под отбор журнала по разделу и по сущности (issue #815, #816).
--
-- 🔴 `[entity, createdAt]` не дублирует `[entity, entityId, createdAt]`: тот
-- обслуживает ленту одной сущности, а отбор раздела спрашивает «все события
-- отзывов, новые сверху» — время там третьим полем, и выборку пришлось бы
-- сортировать целиком.
CREATE INDEX "ActivityEvent_entity_createdAt_idx" ON "ActivityEvent"("entity", "createdAt");

-- Отбор по разделу панели уходит как `action IN (…)`: список действий раздела
-- известен коду. Сравнение с началом строки индексом не обслуживается — при
-- русской сортировке btree по префиксу не работает.
CREATE INDEX "ActivityEvent_action_createdAt_idx" ON "ActivityEvent"("action", "createdAt");

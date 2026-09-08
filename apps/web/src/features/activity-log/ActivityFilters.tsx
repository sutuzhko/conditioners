import Link from 'next/link';

import {
  ACTIVITY_SECTIONS,
  ACTIVITY_SECTION_TITLES,
  activityEntitySchema,
  activityEntityTitle,
  activityFilterOn,
  type ActivityFilter,
} from '@/entities/activity/model';
import { ADMIN_ROLES } from '@/entities/staff/model';
import {
  Card,
  Input,
  Select,
  buttonClassName,
  fieldRowActionsClassName,
  fieldRowClassName,
} from '@/shared/ui';

import { activityLogContent as texts } from './content';
import { ACTIVITY_PATH, type ActivityPersonView } from './model';
import styles from './ActivityFilters.module.css';

export interface ActivityFiltersProps {
  /** Отбор, с которым страница отрисована: поля открываются заполненными. */
  readonly filter: ActivityFilter;
  /** Кого можно выбрать в «Кто» — учётные записи панели, имя и `id`. */
  readonly people: readonly ActivityPersonView[];
}

/**
 * Отбор журнала: человек, роль, раздел, сущность и период (issue #815).
 *
 * 🔴 Серверный компонент без единой строки своего JavaScript. Обычная форма
 * `method="get"` уводит условия в адрес сама: отбор живёт в адресе (ADR-105),
 * найденную страницу журнала можно прислать себе ссылкой, а раздел не платит
 * за отбор ни байтом бюджета. Тот же приём, что у отбора отзывов.
 *
 * 🔴 Номер страницы в форму не попадает намеренно. Отбор всегда открывается с
 * первой страницы: остаться на седьмой после смены условий значит увидеть
 * пустой список там, где записи есть.
 *
 * Раздел и сущность стоят рядом и сегодня отвечают почти одинаково — событий
 * пока не пишет никто, кроме модерации отзывов. Расходятся они на фазе 2:
 * раздел отвечает «где нажали» (`stock.move`), сущность — «над чем»
 * (позиция склада), и одно действие раздела бьёт по разным сущностям.
 */
export function ActivityFilters({ filter, people }: ActivityFiltersProps) {
  return (
    <Card as="section" className={styles.card}>
      <form className={fieldRowClassName(styles.form)} action={ACTIVITY_PATH} method="get">
        <Select
          label={texts.filterActor}
          name="actor"
          defaultValue={filter.actor}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterActorAll },
            ...people.map((person) => ({ value: person.id, label: person.name })),
          ]}
        />

        <Select
          label={texts.filterRole}
          name="role"
          defaultValue={filter.role ?? ''}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterRoleAll },
            ...ADMIN_ROLES.map((role) => ({ value: role, label: texts.roleTitle(role) })),
          ]}
        />

        <Select
          label={texts.filterSection}
          name="section"
          defaultValue={filter.section ?? ''}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterSectionAll },
            ...ACTIVITY_SECTIONS.map((section) => ({
              value: section,
              label: ACTIVITY_SECTION_TITLES[section],
            })),
          ]}
        />

        <Select
          label={texts.filterEntity}
          name="entity"
          defaultValue={filter.entity ?? ''}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterEntityAll },
            ...activityEntitySchema.options.map((entity) => ({
              value: entity,
              label: activityEntityTitle(entity),
            })),
          ]}
        />

        {/* Границы периода включительные обе: «с 1 по 8 сентября» покрывает
            восьмое целиком, до московской полуночи (ADR-080). */}
        <Input
          label={texts.filterFrom}
          name="from"
          type="date"
          defaultValue={filter.from ?? ''}
          wrapperClassName={styles.field}
        />

        <Input
          label={texts.filterTo}
          name="to"
          type="date"
          defaultValue={filter.to ?? ''}
          wrapperClassName={styles.field}
        />

        <div className={fieldRowActionsClassName(styles.actions)}>
          <button className={buttonClassName({ size: 'sm' })} type="submit">
            {texts.filterSubmit}
          </button>

          {/* Сброс — ссылка, а не кнопка: условия живут в адресе, и снять их
              значит уйти на тот же раздел без хвоста. */}
          {activityFilterOn(filter) ? (
            <Link className={`${styles.reset} tapAction`} href={ACTIVITY_PATH}>
              {texts.filterReset}
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

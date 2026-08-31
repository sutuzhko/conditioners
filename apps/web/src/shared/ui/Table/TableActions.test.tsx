import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IconButton } from '../IconButton/IconButton';
import { Icon } from '../Icon';
import { TableActions } from './TableActions';

describe('Действия строки таблицы', () => {
  it('собирает действия в именованную группу — без имени озвучка называет её «группа»', () => {
    render(
      <TableActions label="Действия над нарядом № 1059">
        <IconButton label="Открыть" icon={<Icon name="search" />} />
        <IconButton label="Отменить" icon={<Icon name="close" />} />
      </TableActions>,
    );

    const group = screen.getByRole('group', { name: 'Действия над нарядом № 1059' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument();
  });

  /* 🔴 Действия видны всегда, а не проявляются по наведению: наведения нет
     ни на телефоне, ни у клавиатуры. Проверяется наличием кнопок в дереве
     без всякого события — если бы они рисовались по ховеру, их бы тут не было. */
  it('действия присутствуют в разметке до всякого наведения', () => {
    render(
      <TableActions label="Действия">
        <IconButton label="Удалить" icon={<Icon name="close" />} />
      </TableActions>,
    );

    expect(screen.getByRole('button', { name: 'Удалить' })).toBeVisible();
  });
});

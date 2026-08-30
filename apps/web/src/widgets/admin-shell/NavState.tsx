'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { NAV_COOKIE, NAV_COOKIE_MAX_AGE } from './navCookie';
import styles from './AdminShell.module.css';

type NavContext = {
  readonly open: boolean;
  readonly toggle: () => void;
};

const context = createContext<NavContext | null>(null);

export function useNavState(): NavContext {
  const value = useContext(context);
  if (value === null) throw new Error('Кнопка навигации живёт только внутри оболочки панели');
  return value;
}

export interface NavStateProps {
  /**
   * Состояние с сервера: оно прочитано из cookie в разметке.
   *
   * 🔴 Не из `localStorage` после гидратации: панель мигала бы развёрнутой
   * колонкой на каждом заходе, а на медленной машине — заметно долго.
   */
  readonly initialOpen: boolean;
  readonly children: ReactNode;
}

/**
 * Состояние боковой навигации: развёрнута или убрана.
 *
 * Обёртка клиентская, содержимое — серверное: React передаёт его как
 * `children`, поэтому разделы панели остаются серверными компонентами
 * (инвариант 1), а на клиент уезжает только переключатель.
 */
export function NavState({ initialOpen, children }: NavStateProps) {
  const [open, setOpen] = useState(initialOpen);

  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;
      document.cookie = `${NAV_COOKIE}=${next ? 'on' : 'off'}; path=/admin; max-age=${NAV_COOKIE_MAX_AGE}; samesite=lax`;
      return next;
    });
  }, []);

  const value = useMemo(() => ({ open, toggle }), [open, toggle]);

  return (
    <context.Provider value={value}>
      {/* 🔴 `data-ui="panel"` включает плотность и геометрию панели
          (tokens.css, ADR-187): за пределами этого контейнера панельных
          переменных нет, и витрина остаётся на своей геометрии. */}
      <div className={styles.shell} data-ui="panel" data-nav={open ? 'on' : 'off'}>
        {children}
      </div>
    </context.Provider>
  );
}

'use client';

import { useRouter } from 'next/navigation';

import { SettingsGroups, type GroupEntry } from '@/features/settings-form';

/**
 * Обвязка формы данных компании: после сохранения страница перечитывается.
 *
 * 🔴 Нужна затем, что готовность считает сервер. Без перечитывания плашки
 * групп и полоса остались бы прежними до следующего захода — то есть панель
 * показывала бы незаполненной группу, которую владелец только что заполнил.
 */
export function CompanyEditor({ entries }: { readonly entries: readonly GroupEntry[] }) {
  const router = useRouter();

  return <SettingsGroups entries={entries} onSaved={() => router.refresh()} />;
}

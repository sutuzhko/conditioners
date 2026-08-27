'use client';

import { useState, type FormEvent } from 'react';

import { Badge, Button, Card, Input } from '@/shared/ui';

import { deliveryLogContent as texts } from './content';
import { addressApi } from './lib';
import type { AddressApi, DeliveryAddressView } from './model';
import styles from './DeliveryAddresses.module.css';

export interface DeliveryAddressesProps {
  readonly people: readonly DeliveryAddressView[];
  /** Правка адресов; по умолчанию — `PATCH /api/admin/notifications/recipients/{id}`. */
  readonly api?: AddressApi | undefined;
}

const ROLE_TITLES: Readonly<Record<DeliveryAddressView['role'], string>> = {
  owner: texts.roleOwner,
  installer: texts.roleInstaller,
};

/**
 * Адреса доставки по людям.
 *
 * 🔴 Chat ID здесь не вводится: человек его не знает и узнать сам не может.
 * Панель показывает код, человек присылает код боту, бот запоминает чат —
 * это единственный путь, при котором чужую учётную запись к себе не привяжешь.
 *
 * Почта вводится руками: адрес человек знает и диктует сам.
 */
export function DeliveryAddresses({ people, api = addressApi }: DeliveryAddressesProps) {
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const [unbound, setUnbound] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const draftOf = (person: DeliveryAddressView): string => drafts[person.id] ?? person.email ?? '';

  const saveEmail = async (person: DeliveryAddressView): Promise<void> => {
    setBusy(`email:${person.id}`);
    setFailed(null);

    const result = await api.saveEmail(person.id, draftOf(person));

    setBusy(null);
    if (result.ok) {
      setSaved((previous) => [...previous, person.id]);
      return;
    }
    setFailed(result.message ?? texts.addressError);
  };

  const unbind = async (person: DeliveryAddressView): Promise<void> => {
    setBusy(`telegram:${person.id}`);
    setFailed(null);

    const result = await api.unbind(person.id);

    setBusy(null);
    if (result.ok) {
      setUnbound((previous) => [...previous, person.id]);
      return;
    }
    setFailed(result.message ?? texts.addressError);
  };

  return (
    <section aria-labelledby="delivery-addresses">
      <h2 className={styles.title} id="delivery-addresses">
        {texts.addressesTitle}
      </h2>
      <p className={styles.hint}>{texts.addressesHint}</p>

      {people.length === 0 ? (
        <p className={styles.empty}>{texts.addressesEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {people.map((person) => {
            const bound = person.telegram && !unbound.includes(person.id);
            const emailBusy = busy === `email:${person.id}`;
            const telegramBusy = busy === `telegram:${person.id}`;

            return (
              <li key={person.id}>
                <Card variant="soft" padding="md" className={styles.person}>
                  <div className={styles.head}>
                    <span className={styles.name}>{person.name}</span>
                    <span className={styles.role}>{ROLE_TITLES[person.role]}</span>
                    {person.active ? null : (
                      <Badge variant="neutral" size="sm">
                        {texts.inactive}
                      </Badge>
                    )}
                    <Badge variant={bound ? 'success' : 'warning'} size="sm">
                      {bound ? texts.telegramBound : texts.telegramMissing}
                    </Badge>
                  </div>

                  {bound ? (
                    <div className={styles.row}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={telegramBusy}
                        onClick={() => {
                          void unbind(person);
                        }}
                      >
                        {telegramBusy ? texts.unbinding : texts.unbind}
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.code}>
                      <span className={styles.codeLabel}>{texts.codeLabel}</span>
                      <code className={styles.codeValue}>{person.code}</code>
                      <p className={styles.codeHint}>{texts.codeHint}</p>
                    </div>
                  )}

                  {unbound.includes(person.id) ? (
                    <p className={styles.done}>{texts.unbound}</p>
                  ) : null}

                  <form
                    className={styles.row}
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      void saveEmail(person);
                    }}
                  >
                    <Input
                      type="email"
                      label={texts.emailLabel}
                      placeholder={texts.emailPlaceholder}
                      value={draftOf(person)}
                      wrapperClassName={styles.field}
                      onChange={(event) => {
                        const next = event.currentTarget.value;
                        setDrafts((previous) => ({ ...previous, [person.id]: next }));
                        setSaved((previous) => previous.filter((id) => id !== person.id));
                      }}
                    />
                    <Button type="submit" variant="secondary" size="sm" disabled={emailBusy}>
                      {emailBusy ? texts.emailSaving : texts.emailSave}
                    </Button>
                  </form>

                  {saved.includes(person.id) ? (
                    <p className={styles.done}>{texts.emailSaved}</p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {failed === null ? null : (
        <p className={styles.error} role="alert">
          {failed}
        </p>
      )}
    </section>
  );
}

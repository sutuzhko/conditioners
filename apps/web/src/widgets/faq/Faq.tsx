import { buildFaqItems, faqContent as t } from './content';
import type { FaqFacts } from './model';
import styles from './Faq.module.css';

const HEADING_ID = 'faq-title';

/**
 * Имя группы взаимного исключения. Родное `name` у `<details>` открывает в
 * группе не больше одного вопроса — то же поведение, что у прежнего
 * `mode="single"` аккордеона, но без единой строки JavaScript.
 */
const GROUP = 'faq';

export interface FaqProps extends FaqFacts {
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
  /**
   * Какой вопрос приходит раскрытым. Атрибутом разметки, а не состоянием:
   * раскрытая строка обязана быть видна в снимке истории и в исходном коде
   * страницы, а не появляться после гидрации.
   */
  openId?: string | undefined;
}

/**
 * Частые вопросы.
 *
 * 🔴 Секция серверная целиком, без `'use client'` (issue #282): раскрытие
 * делает родное `<details>`/`<summary>`, разрешённое docs/CLAUDE.md в разделе
 * «Доступность». Прежний аккордеон кита — клиентский компонент, и ради одной
 * галки на лендинг уезжала граница клиента; здесь она не нужна.
 *
 * 🔴 Ответ остаётся в HTML и свёрнутым: FAQ участвует в разметке `FAQPage`
 * (docs/SEO.md §4), а ответа, которого нет в HTML, поисковик не увидит.
 * `<details>` прячет содержимое показом, а не размонтированием, — в исходном
 * коде страницы ответ присутствует дословно.
 */
export function Faq({ installFrom, installTerm, warranty, id = 'faq', openId }: FaqProps) {
  const items = buildFaqItems({ installFrom, installTerm, warranty });

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
        </header>

        <ul className={styles.list} aria-label={t.listLabel}>
          {items.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <details className={styles.details} name={GROUP} open={entry.id === openId}>
                <summary className={styles.summary}>
                  <h3 className={styles.question}>{entry.question}</h3>
                  {/* Знак декоративен: состояние несёт само `<details>`,
                      и читалка объявляет его без нашей помощи. */}
                  <span className={styles.sign} aria-hidden="true" />
                </summary>
                <p className={styles.answer}>{entry.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

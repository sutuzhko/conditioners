import { defaultSymptoms } from './content';
import type { Symptom } from './model';

/**
 * Фикстуры блока: они же документируют, какие данные секция ждёт снаружи
 * (docs/ORCHESTRATION.md, волна 3). В Storybook базы нет, а блок обязан
 * рисоваться — значит данные приходят отсюда.
 *
 * 🔴 Суммы ниже — образец формата, а не прайс компании: настоящие значения
 * задаст владелец. Основное состояние проекта — «цен нет», ему отвечает
 * история по умолчанию, где блок обходится без единой цифры.
 */
const pricesByKey: Readonly<Record<string, number>> = {
  'ne-holodit': 1500,
  'kapaet-voda': 1200,
  zapah: 1800,
  shum: 1000,
  'ne-vklyuchaetsya': 900,
  obmerzaet: 1500,
};

/** Те же шесть разборов, но с проставленной стоимостью работ. */
export const symptomsWithPrices: readonly Symptom[] = defaultSymptoms.map((symptom) => {
  const priceFrom = pricesByKey[symptom.key];
  return priceFrom === undefined ? symptom : { ...symptom, priceFrom };
});

/**
 * Совсем другой список — так выглядят данные, пришедшие снаружи: свои
 * симптомы, свои формулировки, часть без цены.
 */
export const customSymptoms: readonly Symptom[] = [
  {
    key: 'ne-greet',
    label: 'Не греет зимой',
    title: 'Кондиционер не греет зимой',
    causes: 'Нет зимнего комплекта или обмёрз наружный блок',
    fix: 'Проверка режима обогрева, установка зимнего комплекта',
    priceFrom: 2400,
  },
  {
    key: 'techet-naruzhnyy',
    label: 'Течёт наружный блок',
    title: 'С наружного блока течёт вода',
    causes: 'Обмерзание теплообменника при работе на обогрев',
    fix: 'Диагностика режима оттайки',
  },
];

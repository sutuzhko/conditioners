import { ProductDetailsSkeleton } from '@/widgets/catalog';

/**
 * Страница модели на время перехода.
 *
 * Адреса пререндерятся, но по прямой ссылке из выдачи и после истечения ISR
 * человек ждёт ответ сервера. Скелетон повторяет раскладку страницы, поэтому
 * подстановка данных не двигает вёрстку.
 */
export default function ProductLoading() {
  return <ProductDetailsSkeleton />;
}

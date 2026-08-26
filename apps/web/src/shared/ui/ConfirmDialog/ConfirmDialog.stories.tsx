import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { Button } from '../Button/Button';
import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmRequest } from './model';
import { useConfirm } from './useConfirm';

/** Окно открывается опасным действием — так его и видит владелец. */
function Example({ request, open: initial = false }: { request: ConfirmRequest; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {request.confirmLabel}
      </Button>
      <ConfirmDialog
        open={open}
        request={request}
        onResolve={(confirmed) => {
          setOpen(false);
          setAnswer(confirmed ? 'Подтверждено' : 'Отменено');
        }}
      />
      {answer === null ? null : <p>{answer}</p>}
    </>
  );
}

const removeArticle: ConfirmRequest = {
  title: 'Удалить статью «Как выбрать кондиционер»?',
  description: 'Отменить это будет нельзя, а её адрес станет недоступен.',
  confirmLabel: 'Удалить статью',
};

const meta = {
  title: 'UI Kit/ConfirmDialog',
  component: ConfirmDialog,
  args: { open: false, request: removeArticle, onResolve: () => {} },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  name: 'Закрыто',
  render: () => <Example request={removeArticle} />,
};

export const Opened: Story = {
  name: 'Открыто',
  render: () => <Example request={removeArticle} open />,
};

export const WithoutDescription: Story = {
  name: 'Без пояснения',
  render: () => (
    <Example request={{ title: 'Удалить дело из календаря?', confirmLabel: 'Удалить дело' }} open />
  ),
};

export const LongText: Story = {
  name: 'Длинное пояснение',
  render: () => (
    <Example
      request={{
        title: 'Удалить карточку «Иванов Иван Иванович»?',
        description:
          'Обращения этого человека останутся — у них своё согласие на обработку данных и свой срок хранения. Сама карточка со всеми заметками исчезнет безвозвратно.',
        confirmLabel: 'Удалить карточку',
        cancelLabel: 'Не удалять',
      }}
      open
    />
  ),
};

/** Тот же диалог через хук: так его зовут все семь мест панели. */
function HookExample() {
  const { confirm, dialog } = useConfirm();
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          void confirm(removeArticle).then((ok) => setAnswer(ok ? 'Подтверждено' : 'Отменено'));
        }}
      >
        Удалить статью
      </Button>
      {dialog}
      {answer === null ? null : <p>{answer}</p>}
    </>
  );
}

export const ViaHook: Story = { name: 'Через useConfirm', render: () => <HookExample /> };

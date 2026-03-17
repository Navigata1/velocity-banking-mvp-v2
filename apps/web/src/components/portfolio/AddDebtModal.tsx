'use client';

import { ReactNode, useMemo, useState } from 'react';
import type { DebtItem } from '@/engine/portfolio';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

type NewDebtPayload = Omit<DebtItem, 'id' | 'createdAt'>;

interface AddDebtModalProps {
  open: boolean;
  onClose: () => void;
  onAddDebt: (payload: NewDebtPayload) => void;
}

const categories: DebtItem['category'][] = [
  'mortgage',
  'auto',
  'credit_card',
  'student_loan',
  'personal_loan',
  'medical',
  'land',
  'purchase_plan',
  'custom',
];

export default function AddDebtModal({ open, onClose, onAddDebt }: AddDebtModalProps) {
  const initialState = useMemo<NewDebtPayload>(
    () => ({
      name: 'New Debt',
      category: 'auto',
      kind: 'amortized',
      balance: 10000,
      apr: 0.08,
      minPaymentRule: { type: 'fixed', amount: 250 },
      termMonths: 60,
      paymentSource: 'checking',
      notes: '',
    }),
    [],
  );

  const [draft, setDraft] = useState<NewDebtPayload>(initialState);
  const [minType, setMinType] = useState<'fixed' | 'percent'>('fixed');

  const handleSubmit = () => {
    onAddDebt(draft);
    setDraft(initialState);
    setMinType('fixed');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Debt"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save debt</Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>

        <Field label="Category">
          <Select
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value as DebtItem['category'] })}
          >
            {categories.map((category) => (
              <option key={category} value={category}>{category.replace('_', ' ')}</option>
            ))}
          </Select>
        </Field>

        <Field label="Balance">
          <Input
            type="number"
            min={0}
            value={draft.balance}
            onChange={(event) => setDraft({ ...draft, balance: Number(event.target.value) })}
          />
        </Field>

        <Field label="APR (%)">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={draft.apr * 100}
            onChange={(event) => setDraft({ ...draft, apr: Number(event.target.value) / 100 })}
          />
        </Field>

        <Field label="Minimum Payment Type">
          <Select
            value={minType}
            onChange={(event) => {
              const type = event.target.value as 'fixed' | 'percent';
              setMinType(type);
              if (type === 'fixed') {
                setDraft({ ...draft, minPaymentRule: { type: 'fixed', amount: 250 } });
              } else {
                setDraft({ ...draft, minPaymentRule: { type: 'percent', percent: 0.02, floor: 35 } });
              }
            }}
          >
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percent + floor</option>
          </Select>
        </Field>

        {draft.minPaymentRule.type === 'fixed' ? (
          <Field label="Minimum Amount">
            <Input
              type="number"
              min={0}
              value={draft.minPaymentRule.amount}
              onChange={(event) =>
                setDraft({ ...draft, minPaymentRule: { type: 'fixed', amount: Number(event.target.value) } })
              }
            />
          </Field>
        ) : (
          <>
            <Field label="Percent (%)">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={draft.minPaymentRule.percent * 100}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    minPaymentRule: {
                      type: 'percent',
                      percent: Number(event.target.value) / 100,
                      floor: draft.minPaymentRule.type === 'percent' ? draft.minPaymentRule.floor : 35,
                    },
                  })
                }
              />
            </Field>

            <Field label="Floor Amount">
              <Input
                type="number"
                min={0}
                value={draft.minPaymentRule.floor}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    minPaymentRule: {
                      type: 'percent',
                      percent: draft.minPaymentRule.type === 'percent' ? draft.minPaymentRule.percent : 0.02,
                      floor: Number(event.target.value),
                    },
                  })
                }
              />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

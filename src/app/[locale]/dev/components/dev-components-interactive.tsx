'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Radio, RadioGroup } from '@/components/ui/RadioGroup';
import { Textarea } from '@/components/ui/Textarea';
import { theme } from '@/lib/theme-classes';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-xs uppercase tracking-wide ${theme.muted}`}>{label}</span>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

export function DevComponentsInteractive() {
  const [radioValue, setRadioValue] = useState('table');
  const [modalOpen, setModalOpen] = useState(false);
  const clarifyTitleId = useId();

  return (
    <>
      <Row label="Textarea — §8.2b">
        <Textarea
          label="Mỗi từ 1 dòng"
          placeholder={'ephemeral\ntransient\nfleeting'}
          rows={4}
          className="max-w-md"
        />
      </Row>

      <Row label="RadioGroup — §8.11 (Clarification preview)">
        <div className="w-full max-w-md">
          <p id={clarifyTitleId} className="mb-2 text-sm text-text-primary">
            Từ &quot;set&quot; có nhiều nghĩa — bạn gặp trong ngữ cảnh nào?
          </p>
          <RadioGroup
            name="set-meaning"
            value={radioValue}
            onChange={setRadioValue}
            labelledBy={clarifyTitleId}
          >
            <Radio value="table">Đặt / để (set the table)</Radio>
            <Radio value="rules">Tập hợp (a set of rules)</Radio>
            <Radio value="sun">Lặn (the sun sets)</Radio>
          </RadioGroup>
          <div className="mt-4 border-t border-border pt-4">
            <Input label="Hoặc nhập ngữ cảnh" placeholder="VD: set up a meeting" />
          </div>
        </div>
      </Row>

      <Row label="Modal — §8.10">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Mở duplicate-word dialog
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="📚 Bạn đã có từ &quot;ephemeral&quot;"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Bỏ qua
              </Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Giải thích mới
              </Button>
              <Button onClick={() => setModalOpen(false)}>Xem lại từ này</Button>
            </>
          }
        >
          <p className={theme.muted}>Level 2/4 · Ôn 7 lần · Streak: 3</p>
          <p className="mt-2 text-sm">Bạn đang gặp khó khăn với từ này?</p>
        </Modal>
      </Row>
    </>
  );
}

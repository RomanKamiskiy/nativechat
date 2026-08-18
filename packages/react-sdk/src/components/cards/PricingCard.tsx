import React from 'react';
import { NativiqAction } from '../../types';

export const PricingCard = ({
  metadata,
  onAction,
  accentColor,
}: {
  metadata: any;
  onAction?: (action: NativiqAction) => void;
  accentColor?: string;
}) => {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        maxWidth: '300px',
        fontFamily: 'sans-serif',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b' }}>
        {metadata.title || 'Тариф Pro'}
      </h3>
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#0f172a',
        }}
      >
        ${metadata.price || '99'}{' '}
        <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#64748b' }}>
          / мес
        </span>
      </p>
      <ul
        style={{
          padding: 0,
          margin: '0 0 16px 0',
          listStyle: 'none',
          fontSize: '14px',
          color: '#475569',
        }}
      >
        {(metadata.features || ['Все функции']).map((feat: string, i: number) => (
          <li key={i} style={{ marginBottom: '6px' }}>
            ✅ {feat}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAction?.({ actionId: 'checkout', payload: { price: metadata.price } });
        }}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: accentColor || 'var(--nc-accent, #007aff)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
        }}
      >
        Оплатить
      </button>
    </div>
  );
};

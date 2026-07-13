import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME } from './site-metadata';

export const alt = `${SITE_NAME} Money Loop educational dashboard`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const loop = ['Income', 'LOC', 'Expenses', 'Cash Flow', 'Principal'];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#080d0c',
          color: '#f4f7f5',
          padding: '68px 76px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div
              style={{
                width: 70,
                height: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #34d399',
                borderRadius: 16,
                color: '#6ee7b7',
                fontSize: 32,
                fontWeight: 800,
              }}
            >
              IS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 52, fontWeight: 800 }}>{SITE_NAME}</div>
              <div style={{ color: '#9caea6', fontSize: 22 }}>Velocity Banking education and modeling</div>
            </div>
          </div>
          <div style={{ color: '#6ee7b7', fontSize: 20 }}>Truth first. Hope forward.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ maxWidth: 910, fontSize: 38, lineHeight: 1.2, fontWeight: 700 }}>
            See where interest is going. Model what changes.
          </div>
          <div style={{ maxWidth: 940, color: '#b6c3bd', fontSize: 22, lineHeight: 1.4 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {loop.map((label, index) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid #285044',
                  borderRadius: 10,
                  background: index === 3 ? '#0b3b2d' : '#101917',
                  padding: '13px 16px',
                  color: index === 3 ? '#6ee7b7' : '#d8e1dd',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                <span style={{ color: '#34d399' }}>{index + 1}</span>
                {label}
              </div>
              {index < loop.length - 1 ? <span style={{ color: '#4b6b60', fontSize: 24 }}>›</span> : null}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

import React from 'react';
import Image from 'next/image';

const StockDetailsModal = ({ isOpen, onClose, stock }) => {
  if (!isOpen || !stock) return null;

  return (
    <div
      className="modal active"
      style={{
        display: 'flex',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--gray)',
            zIndex: 10,
          }}
        >
          &times;
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid var(--border-color)',
            paddingRight: '30px',
          }}
        >
          {stock.logo ? (
            <Image
              src={stock.logo}
              alt={`${stock.symbol} logo`}
              width={48}
              height={48}
              style={{ borderRadius: '8px', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: '#1a237e',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {stock.symbol.substring(0, 2)}
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{stock.symbol}</h2>
            <div style={{ color: 'var(--gray)', fontSize: '14px' }}>{stock.name}</div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '15px',
            marginBottom: '25px',
          }}
        >
          <div
            className="summary-card"
            style={{
              padding: '15px',
              background: 'var(--table-hover)',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            <div style={{ color: 'var(--gray)', fontSize: '12px', marginBottom: '5px' }}>
              Prix Actuel
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {stock.current_price ? `$${stock.current_price.toFixed(2)}` : '-'}
            </div>
          </div>
          <div
            className="summary-card"
            style={{
              padding: '15px',
              background: 'var(--table-hover)',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            <div style={{ color: 'var(--gray)', fontSize: '12px', marginBottom: '5px' }}>
              Beta (Volatilité)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>
              {stock.beta ? stock.beta.toFixed(2) : '-'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '15px',
            marginBottom: '25px',
          }}
        >
          <div>
            <div style={{ color: 'var(--gray)', fontSize: '12px' }}>Haut 52 Semaines</div>
            <div style={{ fontWeight: 600 }}>
              {stock.high_52w ? `$${stock.high_52w.toFixed(2)}` : '-'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gray)', fontSize: '12px' }}>Bas 52 Semaines</div>
            <div style={{ fontWeight: 600 }}>
              {stock.low_52w ? `$${stock.low_52w.toFixed(2)}` : '-'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gray)', fontSize: '12px' }}>P/E Ratio</div>
            <div style={{ fontWeight: 600 }}>
              {stock.pe_ratio ? stock.pe_ratio.toFixed(2) : '-'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gray)', fontSize: '12px' }}>P/E Forward</div>
            <div style={{ fontWeight: 600 }}>
              {stock.pe_forward ? stock.pe_forward.toFixed(2) : '-'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gray)', fontSize: '12px' }}>PEG Ratio</div>
            <div style={{ fontWeight: 600 }}>
              {stock.peg_ratio ? stock.peg_ratio.toFixed(2) : '-'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gray)', fontSize: '12px' }}>Dividende</div>
            <div style={{ fontWeight: 600, color: 'var(--success)' }}>
              {stock.dividend_yield ? `${stock.dividend_yield.toFixed(2)}%` : '-'}
            </div>
          </div>
        </div>

        {stock.description && (
          <div
            style={{
              marginTop: '20px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '15px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>À propos</h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: '1.6',
                color: 'var(--text-color)',
                opacity: 0.9,
                textAlign: 'justify',
                whiteSpace: 'pre-wrap',
              }}
            >
              {stock.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetailsModal;

import React from 'react'

// Lio, caniche toy negro, dibujado con círculos esponjosos
export default function LioMascot({ size = 132, sad = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 0.92}
      viewBox="0 0 120 110"
      className={className}
      aria-label={sad ? 'Lio, esperando en casa' : 'Lio, esperando ilusionado'}
    >
      <circle cx="25" cy="55" r="20" fill="#35312c" />
      <circle cx="95" cy="55" r="20" fill="#35312c" />
      <circle cx="45" cy="22" r="14" fill="#403b35" />
      <circle cx="75" cy="22" r="14" fill="#403b35" />
      <circle cx="60" cy="16" r="15" fill="#35312c" />
      <circle cx="60" cy="60" r="34" fill="#35312c" />
      <ellipse cx="60" cy="74" rx="16" ry="12" fill="#453f38" />
      {sad ? (
        <>
          <path d="M42 56 q5 -5 10 0" stroke="#14120f" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68 56 q5 -5 10 0" stroke="#14120f" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="47" cy="55" r="4.5" fill="#14120f" />
          <circle cx="73" cy="55" r="4.5" fill="#14120f" />
          <circle cx="48.5" cy="53.5" r="1.5" fill="#fff" />
          <circle cx="74.5" cy="53.5" r="1.5" fill="#fff" />
        </>
      )}
      <ellipse cx="60" cy="70" rx="6" ry="4.5" fill="#14120f" />
      {!sad && <path d="M55 80 q5 9 10 0 z" fill="#e4737f" />}
      <circle cx="60" cy="96" r="5" fill="#e89b3c" />
    </svg>
  )
}

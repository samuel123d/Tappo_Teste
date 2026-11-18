import React, { useMemo } from 'react';
import { generateQrMatrix } from '../utils/qrGenerator';

export default function QrCodeBox({ value, size = 168, id }) {
  const safeValue = value || `${window.location.origin}/m/M01`;
  const matrix = useMemo(() => generateQrMatrix(safeValue), [safeValue]);
  const n = matrix.length;
  const quiet = 3;
  const totalView = n + quiet * 2;

  return (
    <div className="bg-white p-3 rounded-2xl inline-flex items-center justify-center shadow-lg border border-zinc-200">
      <svg
        id={id}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${totalView} ${totalView}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR Code para ${safeValue}`}
      >
        <rect width={totalView} height={totalView} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((dark, c) =>
            dark ? (
              <rect
                key={`${r}-${c}`}
                x={c + quiet}
                y={r + quiet}
                width="1"
                height="1"
                fill="#09090b"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

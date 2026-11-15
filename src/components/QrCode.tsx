import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { toQR } from 'toqr';

import { color } from '../theme';

const QUIET = 2; // modules of white border

/** QR code drawn with react-native-svg from toqr's flat module grid (1 = dark). */
export function QrCode({ value, px }: { value: string; px: number }) {
  const { n, d } = useMemo(() => {
    const grid = toQR(value);
    const side = Math.round(Math.sqrt(grid.length));
    let path = '';
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        if (grid[y * side + x]) path += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
      }
    }
    return { n: side + QUIET * 2, d: path };
  }, [value]);

  return (
    <Svg width={px} height={px} viewBox={`0 0 ${n} ${n}`} accessibilityLabel="QR code of the invite link">
      <Rect x={0} y={0} width={n} height={n} fill={color.text} />
      <Path d={d} fill={color.bg} />
    </Svg>
  );
}

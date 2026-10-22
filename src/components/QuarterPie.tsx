import React from 'react';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { c, font } from '../theme';

// Donut split into 4 separated quarters. Sage = still there, grey = used. mask[i] true = quarter i left.
const C = 100, RO = 92, RI = 42;
const pt = (r: number, a: number) => `${C + r * Math.cos(a)} ${C + r * Math.sin(a)}`;
const seg = (q: number) => {
  const a0 = (q * Math.PI) / 2 - Math.PI / 2, a1 = ((q + 1) * Math.PI) / 2 - Math.PI / 2;
  return `M ${pt(RO, a0)} A ${RO} ${RO} 0 0 1 ${pt(RO, a1)} L ${pt(RI, a1)} A ${RI} ${RI} 0 0 0 ${pt(RI, a0)} Z`;
};

export function QuarterPie({ mask, onChange, size = 240 }: { mask: boolean[]; onChange: (m: boolean[]) => void; size?: number }) {
  const left = mask.filter(Boolean).length;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {[0, 1, 2, 3].map(q => (
        <Path key={q} d={seg(q)} fill={mask[q] ? c.sage[500] : c.ink[100]} stroke="#fff" strokeWidth={8} strokeLinejoin="round"
          onPress={() => onChange(mask.map((v, i) => (i === q ? !v : v)))} />
      ))}
      <SvgText x={C} y={C + 4} textAnchor="middle" fontSize={28} fontFamily={font.display} fill={c.ink[800]}>{left}/4</SvgText>
      <SvgText x={C} y={C + 20} textAnchor="middle" fontSize={10} fontFamily={font.bodySemi} fill={c.ink[400]}>LEFT</SvgText>
    </Svg>
  );
}

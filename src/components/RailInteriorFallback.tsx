import { useId } from 'react';
import type { CabinSeat, CabinZone } from '../content/cabin';

/** A readable carriage plan when the browser cannot create a 3D context. */
export default function RailInteriorFallback({ mode, seat, zone, doorOpen = false }: {
  mode: 'coach' | 'cab' | 'freight'; seat?: CabinSeat; zone?: CabinZone; doorOpen?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const suite = mode === 'coach' && zone?.key === 'first';
  const title = suite ? `PRIVATE SUITE ${seat?.id}` : mode === 'cab' ? "SR350 · DRIVER’S CAB" : mode === 'freight' ? 'SR350 · FREIGHT CARRIAGE' : `${zone?.name.toUpperCase()} · CARRIAGE PLAN`;
  return <div className="absolute inset-0 bg-[#071015]">
    <svg viewBox="0 0 1000 560" className="h-full w-full" role="img" aria-label={suite
      ? 'Private first-class room with a daybed, armchair, window desk, personal screen, reading light and sliding door onto the corridor.'
      : title}>
      <defs>
        <linearGradient id={`${id}-floor`} x2="1" y2="1"><stop stopColor="#273d40"/><stop offset="1" stopColor="#12282b"/></linearGradient>
        <pattern id={`${id}-carpet`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#91aaab" strokeOpacity=".08"/></pattern>
        <linearGradient id={`${id}-glass`} x2="0" y2="1"><stop stopColor="#294f62"/><stop offset="1" stopColor="#112531"/></linearGradient>
      </defs>
      <text x="52" y="52" fill="#d9c498" fontFamily="monospace" fontSize="17" letterSpacing="3">{title}</text>
      <text x="52" y="78" fill="#8ea5ac" fontFamily="sans-serif" fontSize="13">Layout view · 3D unavailable in this browser</text>
      {suite ? <>
        <rect x="330" y="102" width="290" height="390" rx="6" fill={`url(#${id}-floor)`} stroke="#d9c498" strokeWidth="7"/>
        <rect x="335" y="107" width="280" height="380" fill={`url(#${id}-carpet)`}/>
        <rect x="622" y="102" width="90" height="390" fill="#1a262b"/>
        <text x="678" y="302" transform="rotate(90 678 302)" textAnchor="middle" fill="#81949a" fontFamily="monospace" fontSize="12" letterSpacing="3">CORRIDOR</text>
        <rect x="322" y="144" width="16" height="262" rx="3" fill={`url(#${id}-glass)`} stroke="#70a8b5"/>
        <path d="M330 157V393" stroke="#91dbe5" strokeWidth="3"/>
        <rect x="353" y="127" width="240" height="108" rx="9" fill="#7b9d9a"/>
        <rect x="361" y="134" width="224" height="92" rx="7" fill="#eee9dc"/>
        <rect x="373" y="144" width="57" height="71" rx="10" fill="#fffdf6"/>
        <path d="M450 136V224" stroke="#bdad91" strokeWidth="2"/>
        <rect x="351" y="260" width="55" height="112" rx="4" fill="#c2a66e"/>
        <rect x="355" y="264" width="47" height="104" rx="3" fill="#e4ded0"/>
        <circle cx="379" cy="278" r="9" fill="#fff1bd" stroke="#b79d63" strokeWidth="3"/>
        <rect x="470" y="291" width="101" height="112" rx="20" fill="#426b68" stroke="#aac1b9" strokeWidth="2"/>
        <rect x="477" y="368" width="87" height="28" rx="10" fill="#5c827b"/>
        <rect x="455" y="310" width="20" height="76" rx="8" fill="#244846" stroke="#c2a66e"/>
        <rect x="568" y="310" width="20" height="76" rx="8" fill="#244846" stroke="#c2a66e"/>
        <rect x="483" y="252" width="75" height="30" rx="9" fill="#426b68"/>
        <rect x="440" y="475" width="85" height="9" rx="3" fill="#00c9f1"/>
        <path d="M620 298V400" stroke="#071015" strokeWidth="10"/>
        <path d={doorOpen ? 'M620 200V296' : 'M620 300V398'} stroke="#acb9b8" strokeWidth="7"/>
        <path d="M620 303h-12m0 0v21" stroke="#d9c498" strokeWidth="3" fill="none" transform={doorOpen ? 'translate(0 -100)' : undefined}/>
        <g fill="#d7e4e3" fontFamily="sans-serif" fontSize="14">
          <text x="230" y="183" textAnchor="end">Daybed</text><path d="M245 180H328" stroke="#526b72"/>
          <text x="230" y="313" textAnchor="end">Window desk</text><path d="M245 310H348" stroke="#526b72"/>
          <text x="230" y="350" textAnchor="end">Panoramic window</text><path d="M245 347H319" stroke="#526b72"/>
          <text x="756" y="348">Sliding door</text><path d="M625 344H741" stroke="#526b72"/>
          <text x="756" y="421">Reclining armchair</text><path d="M580 403L610 418H741" stroke="#526b72" fill="none"/>
          <text x="756" y="480">Personal screen</text><path d="M530 480H741" stroke="#526b72"/>
        </g>
      </> : mode === 'cab' ? <>
        <path d="M180 100H820L950 305H50Z" fill={`url(#${id}-glass)`}/>
        <path d="M475 104L280 305M525 104L720 305" stroke="#93bbc6" strokeWidth="5"/>
        <path d="M490 104L375 305M510 104L625 305" stroke="#647d84" strokeWidth="5"/>
        <rect x="55" y="305" width="890" height="172" rx="24" fill="#26353c" stroke="#5b6d76" strokeWidth="4"/>
        <rect x="150" y="330" width="285" height="113" rx="8" fill="#071216" stroke="#00c9f1"/>
        <rect x="560" y="330" width="215" height="113" rx="8" fill="#071216" stroke="#00c9f1"/>
        <text x="180" y="365" fill="#00c9f1" fontFamily="monospace" fontSize="17">DRIVER DISPLAY</text>
        <text x="180" y="400" fill="#e5edf0" fontFamily="monospace" fontSize="18">SR350 · LINE STATUS</text>
        <text x="580" y="365" fill="#00c9f1" fontFamily="monospace" fontSize="16">MARKET / SIGNALS</text>
        <path d="M839 433V360" stroke="#a2b3bc" strokeWidth="12"/><rect x="815" y="348" width="48" height="24" rx="6" fill="#101820"/>
      </> : <>
        <rect x="180" y="130" width="640" height="310" rx="35" fill={`url(#${id}-floor)`} stroke="#bdc8c8" strokeWidth="8"/>
        <path d="M200 147H800M200 423H800" stroke="#85cbd5" strokeWidth="5"/>
        <path d="M205 284H795" stroke="#88a29e" strokeDasharray="5 9"/>
        {Array.from({ length: 6 }, (_, row) => [0, 1, 2, 3].map((col) => {
          const x = 225 + row * 94, y = col < 2 ? 164 + col * 46 : 310 + (col - 2) * 46;
          return <g key={`${row}-${col}`}><rect x={x} y={y} width="53" height="36" rx={mode === 'freight' ? 3 : 9} fill={mode === 'freight' ? '#61757e' : '#357c82'} stroke={mode === 'freight' ? '#c9b16f' : '#aac8c6'} strokeWidth="2"/>
            {mode === 'coach' && <text x={x + 26} y={y + 23} textAnchor="middle" fill="#eaf4f3" fontFamily="monospace" fontSize="13">{'ABCD'[col]}</text>}</g>;
        }))}
        <text x="500" y="289" textAnchor="middle" fill="#acc2c3" fontFamily="monospace" fontSize="12">{mode === 'freight' ? 'SECURED FREIGHT / CENTRAL WALKWAY' : '2 + 2 SEATING / CENTRAL AISLE'}</text>
      </>}
    </svg>
  </div>;
}

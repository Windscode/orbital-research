import { useId } from 'react';

type BlueprintProps = {
  className?: string;
  compact?: boolean;
};

/** An original concept drawing, deliberately separate from project evidence. */
export default function Blueprint({ className, compact = false }: BlueprintProps) {
  const id = `blueprint-${useId().replace(/:/g, '')}`;
  const accent = '#d3ef83';

  return (
    <svg
      className={className}
      viewBox="0 0 760 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" stroke="#a1b3aa" strokeOpacity=".055" strokeWidth=".6" />
        </pattern>
        <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0V7" stroke="#b8c3bd" strokeOpacity=".28" strokeWidth=".7" />
        </pattern>
        <linearGradient id={`${id}-shell`} x1="0" y1="90" x2="0" y2="155" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bac9c2" stopOpacity=".025" />
          <stop offset=".48" stopColor="#bac9c2" stopOpacity=".08" />
          <stop offset="1" stopColor="#bac9c2" stopOpacity=".015" />
        </linearGradient>
        <radialGradient id={`${id}-planet`} cx=".33" cy=".3" r=".8">
          <stop stopColor="#b8c7bc" stopOpacity=".12" />
          <stop offset="1" stopColor="#b8c7bc" stopOpacity="0" />
        </radialGradient>
        <marker id={`${id}-arrow`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M5.5 1L1 3L5.5 5" stroke={accent} strokeWidth=".8" fill="none" />
        </marker>
        <clipPath id={`${id}-planet-clip`}>
          <circle cx="646" cy="227" r="39" />
        </clipPath>
      </defs>

      <rect x="16" y="12" width="728" height="276" fill={`url(#${id}-grid)`} />
      <g stroke="#8f9e96" strokeWidth=".65" opacity=".35">
        <path d="M16 26V12H30M730 12H744V26M16 274V288H30M730 288H744V274" />
        <path d="M22 122H704M112 69V174M303 75V174M486 69V174M638 78V168" strokeDasharray="3 6" />
        <path d="M105 122H119M112 115V129M631 122H645M638 115V129" />
      </g>

      <g fill="#85958b" fontFamily="'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace" fontSize="7" letterSpacing="1.4">
        <text x="28" y="30">VEHICLE GEOMETRY / CUTAWAY STUDY</text>
        <text x="731" y="30" textAnchor="end">FIG. 01</text>
      </g>

      {/* A clean longitudinal section: propulsion, primary tank, interstage, upper stage. */}
      <g stroke="#bec8c1" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M112 97H486C531 97 588 103 638 122C588 141 531 147 486 147H112Z" fill={`url(#${id}-shell)`} />
        <path d="M112 101H486C538 101 592 109 628 122C592 135 538 143 486 143H112" strokeOpacity=".38" strokeWidth=".6" />

        {/* Thrust structure and three engine bells, shown schematically. */}
        <path d="M112 101H133V143H112ZM117 101L128 112L117 122L128 133L117 143M128 101L117 112L128 122L117 133L128 143" strokeOpacity=".7" />
        <path d="M112 108H101L96 103L72 99V116L96 112L101 108M112 122H96L91 117L65 113V131L91 127L96 122M112 136H101L96 131L72 128V145L96 141L101 136" />
        <path d="M76 101V114M69 115V129M76 130V143" strokeOpacity=".42" />
        <path d="M85 102L94 106M84 113L94 109M78 116L89 120M77 128L89 124M85 131L94 135M84 142L94 139" strokeOpacity=".32" strokeWidth=".6" />
        <path d="M133 105H148V139H133M133 112H143M133 122H148M133 132H143" />
        <path d="M140 97L120 79H153L168 97M140 147L120 165H153L168 147" fill={`url(#${id}-hatch)`} strokeOpacity=".7" />
        <path d="M153 80V95M153 149V164" strokeOpacity=".45" />

        {/* Curved tank bulkheads with baffles and a common feed axis. */}
        <path d="M170 103H222C237 103 240 141 222 141H170C152 141 152 103 170 103Z" />
        <path d="M170 103C182 108 182 136 170 141M222 103C210 108 210 136 222 141" strokeOpacity=".35" />
        <path d="M178 109H214M178 135H214M190 104V140M199 104V140M208 104V140" strokeOpacity=".24" strokeWidth=".6" />
        <path d="M248 103H284C300 103 300 141 284 141H248C232 141 232 103 248 103Z" />
        <path d="M248 103C260 110 260 134 248 141M284 103C272 110 272 134 284 141" strokeOpacity=".35" />
        <path d="M264 105V139M273 105V139" strokeOpacity=".24" strokeWidth=".6" />
        <path d="M148 122H296" strokeOpacity=".3" strokeDasharray="2 4" />
        <path d="M169 141V145H292V139M169 103V99H292V105" strokeOpacity=".4" strokeWidth=".6" />

        {/* Separation ring and open interstage truss. */}
        <path d="M300 97V147M306 97V147M311 97V147M338 97V147M344 97V147" />
        <path d="M311 98L338 146M338 98L311 146M311 98L338 122L311 146M338 98L311 122L338 146" strokeOpacity=".48" strokeWidth=".65" />
        <path d="M338 118H328L319 108V136L328 126H338" fill="#121a16" fillOpacity=".65" />
        <path d="M344 106H355V138H344" strokeOpacity=".6" />

        {/* Upper stage, payload adapter, and fairing interior. */}
        <path d="M365 103H443C461 103 461 141 443 141H365C348 141 348 103 365 103Z" />
        <path d="M365 103C378 112 378 132 365 141M408 104C420 112 420 132 408 140M443 103C430 112 430 132 443 141" strokeOpacity=".4" />
        <path d="M382 106V138M395 106V138M425 106V138" strokeOpacity=".2" strokeWidth=".6" />
        <path d="M458 98V146M465 99V145M465 105L481 112V132L465 139M481 112H502V132H481" />
        <path d="M486 98V147M490 98V147" strokeOpacity=".65" />
        <path d="M502 108H531L543 115V129L531 136H502ZM507 108V136M527 108V136M502 115H542M502 129H542" strokeOpacity=".7" />
        <path d="M544 122H568M551 116V128M559 118V126" strokeOpacity=".55" />
        <path d="M497 101L515 108M497 143L515 136M555 106L545 115M555 138L545 129M575 112L566 121M575 132L566 123" strokeOpacity=".3" strokeWidth=".6" />
        <path d="M593 111C587 117 587 127 593 133M613 116C610 119 610 125 613 128" strokeOpacity=".32" />
        <path d="M112 122H638" strokeOpacity=".45" strokeWidth=".5" strokeDasharray="12 3 2 3" />
      </g>

      {/* Dimension and section references contain no invented vehicle data. */}
      <g stroke={accent} strokeWidth=".65" opacity=".85">
        <path d="M112 51V82M638 51V108" strokeOpacity=".5" />
        <path d="M115 57H635" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
        <path d="M662 97H682M650 147H682M676 100V144" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
        <path d="M303 87V157" strokeDasharray="3 3" />
        <path d="M299 87H307M299 157H307" />
        <path d="M196 137V181H146M390 137V181H416M525 137L545 162H578" strokeOpacity=".65" />
        <circle cx="196" cy="137" r="2" fill={accent} stroke="none" />
        <circle cx="390" cy="137" r="2" fill={accent} stroke="none" />
        <circle cx="525" cy="137" r="2" fill={accent} stroke="none" />
      </g>
      <g fill={accent} fontFamily="'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace" fontSize="7" letterSpacing="1.1">
        <text x="375" y="49" textAnchor="middle">LONGITUDINAL SECTION</text>
        <text x="687" y="125">Ø D</text>
        <text x="303" y="80" textAnchor="middle">A</text>
        <text x="303" y="168" textAnchor="middle">A</text>
        <text x="97" y="192">PROPELLANT VOLUMES</text>
        <text x="422" y="184">UPPER STAGE</text>
        <text x="583" y="165">PAYLOAD</text>
      </g>

      {!compact && (
        <g>
          {/* A small orthographic end section, not a decorative icon. */}
          <g stroke="#a9b7ae" strokeWidth=".6" opacity=".62">
            <circle cx="110" cy="240" r="30" />
            <circle cx="110" cy="240" r="27" />
            <circle cx="110" cy="240" r="19" strokeDasharray="2 3" />
            <circle cx="110" cy="240" r="5" />
            <path d="M73 240H147M110 203V277" strokeDasharray="9 3 2 3" />
            <path d="M91 220L106 236M129 220L114 236M91 260L106 244M129 260L114 244" />
            <path d="M88 218L92 214M128 214L132 218M88 262L92 266M128 266L132 262" strokeWidth="2" />
          </g>
          <g fill="#819188" fontFamily="'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace" fontSize="6.5" letterSpacing="1">
            <text x="156" y="231">SECTION A–A</text>
            <text x="156" y="243">INTERSTAGE / RING FRAME</text>
            <text x="156" y="256" opacity=".65">GEOMETRY → MASS → DYNAMICS</text>
          </g>
          <g stroke="#a6b7aa" strokeWidth=".6">
            <circle cx="646" cy="227" r="39" fill={`url(#${id}-planet)`} strokeOpacity=".55" />
            <g clipPath={`url(#${id}-planet-clip)`} opacity=".21">
              <ellipse cx="646" cy="227" rx="17" ry="39" />
              <ellipse cx="646" cy="227" rx="31" ry="39" />
              <ellipse cx="646" cy="227" rx="39" ry="13" transform="rotate(-22 646 227)" />
              <ellipse cx="646" cy="214" rx="37" ry="10" transform="rotate(-22 646 227)" />
              <ellipse cx="646" cy="241" rx="37" ry="10" transform="rotate(-22 646 227)" />
              <path d="M647 188V266M607 227H685" />
            </g>
            <ellipse cx="646" cy="227" rx="71" ry="24" transform="rotate(-27 646 227)" strokeOpacity=".4" strokeDasharray="2 4" />
            <path d="M582 259C610 274 694 236 707 202" stroke={accent} strokeOpacity=".7" />
            <path d="M708 199L705 207L712 203Z" fill={accent} stroke="none" />
            <path d="M646 227H703M646 227V180" strokeOpacity=".4" strokeDasharray="3 4" />
            <path d="M646 227L618 251" strokeOpacity=".4" />
            <circle cx="646" cy="227" r="2" fill={accent} stroke="none" />
          </g>
          <g fill="#8e9f92" fontFamily="'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace" fontSize="6.5" letterSpacing="1">
            <text x="709" y="230">X</text>
            <text x="643" y="176">Z</text>
            <text x="606" y="259">Y</text>
            <text x="646" y="282" textAnchor="middle">REFERENCE FRAME / ECI</text>
          </g>
        </g>
      )}

      <g fontFamily="'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace" fontSize="6.5" letterSpacing="1.25">
        <path d="M330 231H502M330 236H382" stroke="#a7b8a9" strokeOpacity=".17" strokeWidth=".6" />
        <text x="330" y="252" fill="#9baa9e">CONCEPT SCHEMATIC · NOT TO SCALE</text>
        <text x="330" y="266" fill="#65776a">AEROSPACE SIMULATION / RESEARCH NOTES</text>
      </g>
    </svg>
  );
}

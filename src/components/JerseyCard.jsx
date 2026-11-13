/**
 * 2D motion jersey — a back-view T-shirt that animates in on the success
 * screen, showing the student's printed name and jersey number.
 */
export default function JerseyCard({ name, number, noPrint, size }) {
  const displayName = (name || '').trim().toUpperCase()
  // Shrink the arch text for long names
  const nameSize = displayName.length > 16 ? 18 : displayName.length > 11 ? 22 : 26

  return (
    <div className="mx-auto max-w-xs">
      <svg
        viewBox="0 0 300 340"
        className="jersey-motion mx-auto block w-full drop-shadow-xl"
        role="img"
        aria-label={
          noPrint
            ? 'Plain T-shirt, back view — no printing'
            : `T-shirt back view with ${displayName} and number ${number}`
        }
      >
        {/* Sleeves (slightly darker) */}
        <path d="M62,34 L14,88 L44,128 L78,112 L78,86 L62,34 Z" fill="#4338ca" />
        <path d="M238,34 L286,88 L256,128 L222,112 L222,86 L238,34 Z" fill="#4338ca" />

        {/* Body */}
        <path
          d="M115,18 C125,30 175,30 185,18 L238,34 L286,88 L256,128 L222,112 L222,296 Q150,312 78,296 L78,112 L44,128 L14,88 L62,34 Z"
          fill="#4f46e5"
        />

        {/* Sleeve stripes */}
        <path d="M52,58 L88,94" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="5" strokeLinecap="round" />
        <path d="M248,58 L212,94" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="5" strokeLinecap="round" />

        {/* Back collar band */}
        <path
          d="M115,18 C125,30 175,30 185,18"
          fill="none"
          stroke="#312e81"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Hem shading */}
        <path d="M78,296 Q150,312 222,296 L222,284 Q150,300 78,284 Z" fill="#000" opacity="0.08" />

        {!noPrint && (
          <>
            {/* Printed name, arched across the shoulders */}
            <defs>
              <path id="jersey-name-arc" d="M52,100 Q150,64 248,100" fill="none" />
            </defs>
            <text
              fill="#ffffff"
              fontFamily="Inter, system-ui, sans-serif"
              fontSize={nameSize}
              fontWeight="800"
              letterSpacing="3"
            >
              <textPath href="#jersey-name-arc" startOffset="50%" textAnchor="middle">
                {displayName}
              </textPath>
            </text>

            {/* Big printed number */}
            <text
              x="150"
              y="212"
              textAnchor="middle"
              fill="#ffffff"
              fontFamily="Inter, system-ui, sans-serif"
              fontSize="96"
              fontWeight="800"
              letterSpacing="2"
            >
              {number}
            </text>
          </>
        )}

        {noPrint && (
          <text
            x="150"
            y="180"
            textAnchor="middle"
            fill="#ffffff"
            fillOpacity="0.55"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="18"
            fontWeight="600"
            letterSpacing="4"
          >
            NO PRINT
          </text>
        )}
      </svg>

      {/* Animated floor shadow */}
      <div className="jersey-shadow mx-auto -mt-3 h-3 w-36 rounded-full bg-[#101828]" />

      <p className="mt-4 text-center text-xs font-semibold uppercase tracking-wide text-[#667085]">
        {noPrint ? 'Plain T-shirt — no printing' : 'Your T-shirt (back view) — printed name & number'}
        {size ? ` · Size ${size}` : ''}
      </p>
    </div>
  )
}

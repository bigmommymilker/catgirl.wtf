import styles from './FlightScene.module.css';

const positions = [
  { left: '23%', top: '34%', delay: '0s', rotate: '-20deg' },
  { left: '69%', top: '25%', delay: '-2s', rotate: '13deg' },
  { left: '76%', top: '56%', delay: '-4s', rotate: '-12deg' },
  { left: '30%', top: '68%', delay: '-6s', rotate: '12deg' },
  { left: '50%', top: '19%', delay: '-3s', rotate: '-8deg' },
  { left: '51%', top: '76%', delay: '-5s', rotate: '16deg' },
];

function Plane() {
  return (
    <svg viewBox="0 0 100 75" aria-hidden="true" className={styles.plane}>
      <path d="M4 38 94 4 57 70 43 48Z" fill="#f8f7ed" stroke="#243e45" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m4 38 39 10L94 4 49 55l8 15" fill="#d8e6df" stroke="#243e45" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M43 48 94 4" fill="none" stroke="#243e45" strokeWidth="1.2" />
    </svg>
  );
}

/** A decorative flight field with one accessible plane button per project. */
export default function FlightScene({ projects = [], onSelect }) {
  return (
    <div className={styles.scene} aria-label="Project flight map">
      <div className={styles.skyGrain} aria-hidden="true" />
      <div className={styles.orbitOne} aria-hidden="true" />
      <div className={styles.orbitTwo} aria-hidden="true" />
      <div className={styles.orbitThree} aria-hidden="true" />
      <div className={styles.globe} aria-hidden="true">
        <svg viewBox="0 0 400 400" className={styles.globeArt}>
          <defs>
            <clipPath id="flight-globe-clip"><circle cx="200" cy="200" r="198" /></clipPath>
          </defs>
          <g clipPath="url(#flight-globe-clip)">
            <circle cx="200" cy="200" r="198" fill="#8eb3ac" />
            <path d="M-30 110 14 88l27 7 16-26 44-16 25 13 11 26-20 18-9 26-24 6-13 33-28 3-11 27-25-7-15-33-29-16ZM96 210l30-11 26 15 12 28-10 25-8 32-24 34-6 34-17-13-5-45-12-27-3-40ZM204 82l28-19 44 6 19 18 36-2 15 24 45 8 30 34-19 28-33-5-20 12-23-12-23 17-22-4-18-29-29-4-5-26-20-10ZM228 210l32-15 36 9 21 29-8 37-25 23-7 32-22 17-17-32-21-16-4-40ZM334 302l30-8 20 14-7 25-36 6-19-16Z" fill="#d5dfc8" opacity=".9" />
            <g fill="none" stroke="#edf4dd" strokeWidth="1" opacity=".28">
              <ellipse cx="200" cy="200" rx="85" ry="198" /><ellipse cx="200" cy="200" rx="155" ry="198" />
              <ellipse cx="200" cy="200" rx="198" ry="75" /><ellipse cx="200" cy="200" rx="198" ry="145" />
              <path d="M2 200h396M200 2v396" />
            </g>
          </g>
        </svg>
      </div>
      {projects.map((project, index) => {
        const position = positions[index % positions.length];
        return (
          <button
            key={project.id ?? index}
            type="button"
            className={styles.flight}
            style={{ left: position.left, top: position.top, '--flight-delay': position.delay, '--plane-rotation': position.rotate }}
            onClick={() => onSelect?.(project)}
            aria-label={`Open project: ${project.title}`}
          >
            <span className={styles.planeWrap}><Plane /></span>
            <span className={styles.tag}><span>{String(index + 1).padStart(2, '0')}</span> {project.title}</span>
          </button>
        );
      })}
      <div className={styles.coordinates} aria-hidden="true">A WORLD OF IDEAS <span>✳</span> READY FOR TAKEOFF</div>
    </div>
  );
}

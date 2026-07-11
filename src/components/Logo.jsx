export default function Logo({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Odyssey mountain path logo">
      <circle cx="32" cy="32" r="29" fill="#16372A" stroke="#6EE7B7" strokeWidth="2" />
      <path d="M13 43 26 21l7 11 5-7 13 18H13Z" fill="#A7D7BC" />
      <path d="M25 50c1-8 13-8 9-17-2-4-1-8 3-13" stroke="#E8B75F" strokeWidth="4" strokeLinecap="round" />
      <circle cx="38" cy="18" r="3" fill="#F4D38F" />
    </svg>
  );
}

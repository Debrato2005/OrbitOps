const headerStyles = {
  backgroundColor: '#1a1a1a',
  padding: '16px 30px',
  color: 'white',
  textAlign: 'left',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  zIndex: 10,
};

const h1Styles = {
  margin: 0,
  fontFamily: '"Exo 2", sans-serif',
  fontSize: '1.8em',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

function Header() {
  return (
    <header style={headerStyles}>
      <h1 style={h1Styles}>OrbitOps</h1>
    </header>
  );
}

export default Header;
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  useEffect(() => {
    // Set styles for the landing page
    document.body.style.margin = '0';
    document.body.style.overflow = 'auto'; // Ensures scrolling is enabled
    document.documentElement.style.scrollBehavior = 'smooth';
    document.body.style.fontFamily = "'Inter', sans-serif";
    
    // Cleanup function
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.contentWrapper}>
        <div style={styles.overlay}></div>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logo}>OrbitOps</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <nav style={styles.nav}>
                <a href="#features" style={styles.navLink}>Features</a>
                <a href="#contact" style={styles.navLink}>Contact</a>
              </nav>
              <Link to="/" style={styles.continueButton}>
                CONTINUE
              </Link>
            </div>
          </div>
        </header>
        <main style={styles.main}>
          <div style={{ maxWidth: '896px' }}>
            <h1 style={styles.h1}>Empowering the Future of Space Exploration</h1>
            <p style={styles.p}>
              OrbitOps is at the forefront of space technology, providing cutting-edge solutions for satellite deployment, orbital mechanics, and interstellar logistics. We are dedicated to making space accessible and sustainable for generations to come.
            </p>
          </div>
        </main>
      </div>

      <section id="features" style={styles.section}>
        <h2 style={styles.sectionTitle}>Features</h2>
        <p style={styles.sectionText}>Discover our cutting-edge satellite and orbital solutions.</p>
      </section>

      <section id="contact" style={styles.section}>
        <h2 style={styles.sectionTitle}>Contact Us</h2>
        <p style={styles.sectionText}>Get in touch with the OrbitOps team to learn more.</p>
      </section>
    </div>
  );
}

// ... styles object remains the same

const styles = {
  page: {
    backgroundColor: '#111827',
    color: 'white',
  },
  contentWrapper: {
    minHeight: '100vh',
    backgroundImage: "url('/landing-background.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'black',
    opacity: 0.5,
  },
  header: {
    position: 'relative',
    zIndex: 10,
    backgroundColor: '#1a1a1a',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 30px',
  },
  logo: {
    margin: 0,
    fontFamily: '"Exo 2", sans-serif',
    fontSize: '1.8em',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  navLink: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'white',
    textDecoration: 'none',
  },
  continueButton: {
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#2563EB',
    color: 'white',
    fontWeight: 600,
    padding: '10px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textDecoration: 'none',
    fontSize: '14px',
    letterSpacing: '0.05em',
  },
  main: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 32px',
  },
  h1: {
    fontFamily: '"Exo 2", sans-serif',
    fontSize: '3.75rem',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  p: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1.25rem',
    color: '#D1D5DB',
  },
  section: {
    padding: '80px 32px',
    textAlign: 'center',
    backgroundColor: '#111827',
  },
  sectionTitle: {
    fontFamily: '"Exo 2", sans-serif',
    fontSize: '2.5rem',
    marginBottom: '16px',
  },
  sectionText: {
    fontSize: '1.125rem',
    color: '#D1D5DB',
    maxWidth: '600px',
    margin: '0 auto',
  },
};

export default LandingPage;
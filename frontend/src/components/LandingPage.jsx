import { useEffect } from 'react';
import Header from './Header'; // Import the unified Header

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
        
        {/* Use the unified Header component */}
        <Header showContinueButton={true} />

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
  main: {
    position: 'relative',
    zIndex: 1, // Lower zIndex than header
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
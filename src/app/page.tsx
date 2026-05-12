import Image from "next/image";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative",
      overflow: "hidden"
    }}>
      <div className="glow" style={{ top: "10%", left: "10%" }}></div>
      <div className="glow" style={{ bottom: "10%", right: "10%", background: "var(--secondary)", opacity: 0.1 }}></div>

      <header style={{
        position: "absolute",
        top: 0,
        width: "100%",
        padding: "2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: "1200px"
      }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-1px" }}>
          CLAUDE<span style={{ color: "var(--primary)" }}>.</span>
        </div>
        <nav style={{ display: "flex", gap: "2rem" }}>
          <a href="#" className="muted-hover">Features</a>
          <a href="#" className="muted-hover">Showcase</a>
          <a href="#" className="muted-hover">Docs</a>
        </nav>
      </header>

      <main style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "1000px",
        zIndex: 1
      }}>
        <div className="glass" style={{
          padding: "8px 16px",
          borderRadius: "100px",
          fontSize: "0.875rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{
            background: "var(--primary)",
            padding: "2px 8px",
            borderRadius: "100px",
            fontSize: "0.75rem",
            fontWeight: 800
          }}>NEW</span>
          Next.js 15 template is now available
        </div>

        <h1 className="gradient-text">
          Build the future of the web with Next.js
        </h1>
        <p style={{ marginBottom: "3rem" }}>
          A premium, high-performance starter template designed for modern web applications.
          Built with TypeScript, App Router, and Vanilla CSS.
        </p>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "5rem" }}>
          <a href="https://nextjs.org/docs" target="_blank" className="btn-primary">
            Get Started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="https://github.com/vercel/next.js" target="_blank" className="glass" style={{
            padding: "12px 24px",
            borderRadius: "12px",
            fontWeight: 600
          }}>
            View on GitHub
          </a>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
          width: "100%",
          marginTop: "2rem"
        }}>
          {[
            { title: "App Router", desc: "The power of React Server Components and nested layouts." },
            { title: "Optimized", desc: "Automatic image, font, and script optimizations out of the box." },
            { title: "TypeScript", desc: "Strictly typed for better developer experience and less bugs." }
          ].map((item, i) => (
            <div key={i} className="glass" style={{
              padding: "2.5rem",
              textAlign: "left"
            }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>{item.title}</h3>
              <p style={{ fontSize: "1rem" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{
        marginTop: "8rem",
        padding: "4rem 2rem",
        borderTop: "1px solid var(--glass-border)",
        width: "100%",
        textAlign: "center"
      }}>
        <p style={{ fontSize: "0.875rem" }}>&copy; 2024 CLAUDE. Built with Next.js</p>
      </footer>

    </div>
  );
}

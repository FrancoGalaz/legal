'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Hooks ─── */

function useScrollReveal(options: { threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true); // Start visible for SSR/static export
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Set hidden briefly so IntersectionObserver can animate it back
    setIsVisible(false);
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsVisible(true); obs.unobserve(e.target); } },
      { threshold: options.threshold || 0.12, rootMargin: options.rootMargin || '0px 0px -40px 0px' }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, isVisible, mounted] as const;
}

function useAnimatedCounter(end: number, duration = 2000, isActive = false) {
  const [count, setCount] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!isActive || done.current) return;
    done.current = true;
    if (typeof window === 'undefined') { setCount(end); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCount(end); return; }
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(e * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, end, duration]);
  return count;
}

function ScrollReveal({
  children,
  delay = 0,
  direction = 'up' as 'up' | 'down' | 'left' | 'right' | 'none',
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ref, isVisible, mounted] = useScrollReveal();
  const offsets: Record<string, string> = {
    up: 'translateY(28px)',
    down: 'translateY(-28px)',
    left: 'translateX(28px)',
    right: 'translateX(-28px)',
    none: 'none',
  };
  const shouldAnimate = mounted && !isVisible;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shouldAnimate ? 0 : 1,
        transform: shouldAnimate ? offsets[direction] : 'translateY(0)',
        transition: mounted ? `opacity 0.72s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.72s cubic-bezier(0.16,1,0.3,1) ${delay}ms` : 'none',
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({
  value,
  active,
  decimals = 0,
}: {
  value: number;
  active: boolean;
  decimals?: number;
}) {
  const count = useAnimatedCounter(
    decimals ? Math.round(value * Math.pow(10, decimals)) : value,
    2200,
    active
  );
  // On server/initial render, show the end value directly
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const display = mounted ? count : value;
  if (decimals) return <span>{(display / Math.pow(10, decimals)).toFixed(decimals)}</span>;
  return <span>{display.toLocaleString('es-CL')}</span>;
}

/* ─── Icons ─── */

function UploadIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 20V8m0 0l-5 5m5-5l5 5" />
      <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="10" />
      <path d="M16 10v6l4 3" />
      <path d="M12 6.5a6 6 0 00-2 1.2" />
      <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="4" width="18" height="24" rx="2" />
      <path d="M11 10h10M11 14h10M11 18h6" />
      <circle cx="22" cy="22" r="4" fill="var(--gold)" stroke="var(--gold)" />
      <path d="M20.5 22l1 1 2-2" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/* ─── Navbar ─── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#" className="nav-logo">
          Legal Agent <span style={{ color: 'var(--gold)' }}>CL</span>
        </a>
        <button
          className={`menu-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú de navegación"
        >
          <span /><span /><span />
        </button>
        <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Producto</a>
          <a href="#demo" onClick={() => setMenuOpen(false)}>Demo</a>
          <a href="#api" onClick={() => setMenuOpen(false)}>API</a>
          <a href="#testimonios" onClick={() => setMenuOpen(false)}>Clientes</a>
          <button className="btn-gold nav-cta" style={{ background: 'var(--gold)' }} onClick={() => setMenuOpen(false)}>
            Comenzar
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */

function HeroSection() {
  const [typingText, setTypingText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fullText =
    'Analizando cláusula 7.3 — Penalización por término anticipado...';

  useEffect(() => {
    setMounted(true);
    let i = 0;
    const iv = setInterval(() => {
      if (i <= fullText.length) {
        setTypingText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(iv);
        setTimeout(() => setShowResult(true), 600);
      }
    }, 38);
    return () => clearInterval(iv);
  }, []);

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-grid" />
        <div className="hero-glow g1" />
        <div className="hero-glow g2" />
      </div>

      <div className="container hero-content">
        <ScrollReveal>
          <div className="hero-badge">
            <span className="badge-dot" />
            IA Legal Chilena
          </div>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div className="hero-logo" aria-label="Legal Agent CL">
            Legal Agent&nbsp;<span style={{ color: 'var(--gold)' }}>CL</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <h1 className="hero-h1">
            Revisión de Contratos<br />
            con Inteligencia Artificial
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={240}>
          <p className="hero-sub">
            Analiza contratos comerciales en segundos. Detecta riesgos, identifica
            cláusulas problemáticas y genera reportes accionables&nbsp;— diseñado
            específicamente para el marco legal chileno.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={320}>
          <div className="hero-ctas">
            <button className="btn-gold" style={{ background: 'var(--gold)' }}>
              Analizar Contrato
            </button>
            <button className="btn-ghost">Ver Demo</button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <div className="hero-preview">
            <div className="prev-bar">
              <span className="prev-file">contrato_arriendo_2026.pdf</span>
              <span className="prev-status">
                <span className="dot-pulse" />Análisis en curso
              </span>
            </div>
            <div className="prev-body">
              <div className="prev-clause">
                <span className="clause-ref">§ 7.3</span>
                <p className="clause-txt">
                  El arrendatario que ponga término anticipado al contrato deberá
                  pagar una multa equivalente a{' '}
                  <mark className="risk-mark high">12 meses de renta</mark>, sin
                  perjuicio de los daños que se acrediten.
                </p>
                <span className="tag-risk high">RIESGO ALTO</span>
              </div>
              <div className="prev-agent">
                <div className="agent-typing">
                  <span className="agent-label">Agente IA</span>
                  <span className="typing-line">
                    {mounted ? typingText : fullText}
                    <span className="cursor-blink">|</span>
                  </span>
                </div>
                <div
                  className="agent-result"
                  style={{
                    opacity: mounted ? (showResult ? 1 : 0) : 1,
                    transform: mounted ? (showResult ? 'translateY(0)' : 'translateY(8px)') : 'translateY(0)',
                    transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <strong>Hallazgo:</strong> Penalización excesiva. La
                  jurisprudencia chilena limita multas a 3–6 meses de renta en
                  arriendos comerciales.
                  <span className="agent-rec">
                    → Recomendar reducción a 4 meses.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ─── Metrics ─── */

interface MetricItem {
  val: number;
  label: string;
  pre?: string;
  suf?: string;
  dec?: number;
}

function MetricsSection() {
  const [ref, vis] = useScrollReveal({ threshold: 0.35 });
  const data: MetricItem[] = [
    { val: 12847, label: 'Contratos Revisados', pre: '+' },
    { val: 97.3, label: 'Precisión del Análisis', suf: '%', dec: 1 },
    { val: 90, label: 'Segundos Promedio', pre: '<', suf: 's' },
    { val: 86, label: 'Firmas Activas', pre: '+' },
  ];

  return (
    <section className="metrics" ref={ref}>
      <div className="container metrics-row">
        {data.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {i > 0 && <div className="m-div" aria-hidden="true" />}
            <div className="m-item">
              <span className="m-val">
                {m.pre || ''}
                <AnimatedNumber
                  value={m.val}
                  active={vis}
                  decimals={m.dec || 0}
                />
                {m.suf || ''}
              </span>
              <span className="m-label">{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── How It Works ─── */

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Sube tu contrato',
      desc: 'Arrastra un PDF o Word. Soportamos arriendos, servicios, compraventas, confidencialidad y contratos de trabajo.',
      icon: UploadIcon,
    },
    {
      num: '02',
      title: 'Análisis con IA',
      desc: 'Nuestro agente revisa cada cláusula contra el marco legal chileno, detectando riesgos y oportunidades de mejora.',
      icon: BrainIcon,
    },
    {
      num: '03',
      title: 'Reporte de riesgos',
      desc: 'Recibe un informe detallado con hallazgos priorizados por severidad, referencias legales y sugerencias de redacción.',
      icon: ReportIcon,
    },
  ];

  return (
    <section className="how-section" id="como-funciona">
      <div className="container">
        <ScrollReveal>
          <h2 className="sec-title">Cómo Funciona</h2>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <p className="sec-sub">
            Tres pasos para transformar horas de revisión en segundos de análisis.
          </p>
        </ScrollReveal>
        <div className="steps-row">
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <ScrollReveal delay={i * 140} className="step-wrap">
                <div className="step-card">
                  <div className="step-num-badge">{s.num}</div>
                  <div className="step-icon-wrap">
                    <s.icon />
                  </div>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                </div>
              </ScrollReveal>
              {i < 2 && (
                <div className="step-conn" aria-hidden="true">
                  <svg
                    viewBox="0 0 80 24"
                    className="conn-arrow"
                    style={{ width: 60, height: 20 }}
                  >
                    <path
                      d="M0 12h64m0 0l-8-6m8 6l-8 6"
                      stroke="var(--gold)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Product Demo ─── */

function ProductDemoSection() {
  const [activeClause, setActiveClause] = useState(0);
  const clauses = [
    {
      ref: '§ 5.2',
      title: 'Renovación Automática',
      text: 'El contrato se renovará automáticamente por períodos iguales y sucesivos, salvo que una de las partes comunique su intención de no renovar con al menos 30 días de anticipación.',
      risk: 'medio' as const,
      finding:
        'Plazo de aviso insuficiente. El estándar en contratos comerciales chilenos es 60–90 días para permitir una transición ordenada.',
      rec: 'Aumentar a 60 días mínimo.',
    },
    {
      ref: '§ 7.3',
      title: 'Penalización por Término Anticipado',
      text: 'El arrendatario que ponga término anticipado al contrato deberá pagar una multa equivalente a 12 meses de renta, sin perjuicio de los daños adicionales que se acrediten.',
      risk: 'alto' as const,
      finding:
        'Penalización excesiva. La jurisprudencia chilena en arriendos comerciales típicamente limita multas a 3–6 meses de renta.',
      rec: 'Reducir penalización a 4 meses.',
    },
    {
      ref: '§ 9.1',
      title: 'Ley Aplicable y Jurisdicción',
      text: 'Las partes acuerdan someterse a la jurisdicción de los tribunales ordinarios de Santiago, renunciando a cualquier otro fuero que pudiera corresponderles.',
      risk: 'bajo' as const,
      finding:
        'Cláusula estándar. La elección de foro en Santiago es válida y habitual en contratos comerciales chilenos.',
      rec: 'Sin cambios requeridos.',
    },
  ];

  const c = clauses[activeClause];
  const riskColors = { alto: 'var(--risk-high)', medio: 'var(--risk-med)', bajo: 'var(--risk-low)' };
  const riskLabels = { alto: 'RIESGO ALTO', medio: 'RIESGO MEDIO', bajo: 'RIESGO BAJO' };

  return (
    <section className="demo-section" id="demo">
      <div className="container">
        <ScrollReveal>
          <h2 className="sec-title">Análisis en Acción</h2>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <p className="sec-sub">
            Así es como nuestro agente revisa cada cláusula de tu contrato.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <div className="demo-panel">
            <div className="demo-doc">
              <div className="doc-header">
                <span className="doc-icon">
                  <svg
                    viewBox="0 0 20 20"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="var(--on-surface-variant)"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="2" width="14" height="16" rx="2" />
                    <path d="M7 6h6M7 9h6M7 12h3" />
                  </svg>
                </span>
                <span className="doc-name">
                  Contrato_Arrendamiento_Comercial.pdf
                </span>
              </div>
              <div className="doc-body">
                <p className="doc-title-text">
                  CONTRATO DE ARRENDAMIENTO COMERCIAL
                </p>
                <p className="doc-meta-text">Santiago, 15 de marzo de 2026</p>
                {clauses.map((cl, i) => (
                  <div
                    key={i}
                    className={`doc-clause ${i === activeClause ? 'active' : ''}`}
                    onClick={() => setActiveClause(i)}
                  >
                    <span className="doc-clause-ref">{cl.ref}</span>
                    <span className="doc-clause-title">{cl.title}</span>
                    <p className="doc-clause-body">{cl.text}</p>
                    {i === activeClause && (
                      <div
                        className="doc-highlight-bar"
                        style={{ background: riskColors[cl.risk] }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="demo-analysis">
              <div className="analysis-header">
                <svg
                  viewBox="0 0 20 20"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                >
                  <circle cx="10" cy="10" r="7" />
                  <path d="M10 7v3l2 2" />
                </svg>
                <span>Análisis del Agente</span>
              </div>
              <div className="analysis-body" key={activeClause}>
                <div className="an-clause-ref">
                  {c.ref} — {c.title}
                  <span
                    className="an-risk-tag"
                    style={{ background: riskColors[c.risk] }}
                  >
                    {riskLabels[c.risk]}
                  </span>
                </div>
                <div className="an-section">
                  <span className="an-label">Hallazgo</span>
                  <p className="an-text">{c.finding}</p>
                </div>
                <div className="an-section">
                  <span className="an-label">Recomendación</span>
                  <p className="an-rec">{c.rec}</p>
                </div>
                <div className="an-severity">
                  <span className="an-label">Severidad</span>
                  <div className="severity-bar">
                    <div
                      className="severity-fill"
                      style={{
                        width:
                          c.risk === 'alto'
                            ? '90%'
                            : c.risk === 'medio'
                              ? '55%'
                              : '20%',
                        background: riskColors[c.risk],
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="analysis-nav">
                {clauses.map((cl, i) => (
                  <button
                    key={i}
                    className={`an-nav-btn ${i === activeClause ? 'active' : ''}`}
                    onClick={() => setActiveClause(i)}
                  >
                    <span
                      className="an-nav-dot"
                      style={{ background: riskColors[cl.risk] }}
                    />
                    {cl.ref}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ─── API Section ─── */

function APISection() {
  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/contracts/analyze',
      desc: 'Envía un contrato para análisis completo. Acepta PDF y DOCX.',
      badge: 'gold',
    },
    {
      method: 'GET',
      path: '/api/v1/contracts/{id}/report',
      desc: 'Obtiene el reporte de análisis con hallazgos y recomendaciones.',
      badge: 'navy',
    },
    {
      method: 'GET',
      path: '/api/v1/contracts/{id}/risks',
      desc: 'Lista los riesgos detectados, priorizados por severidad.',
      badge: 'navy',
    },
    {
      method: 'POST',
      path: '/api/v1/contracts/compare',
      desc: 'Compara dos versiones de un contrato y detecta cambios relevantes.',
      badge: 'gold',
    },
  ];

  return (
    <section className="api-section" id="api">
      <div className="container">
        <ScrollReveal>
          <h2 className="sec-title light">
            API para Desarrolladores
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <p className="sec-sub light">
            Integra la revisión de contratos directamente en tu flujo de trabajo.
          </p>
        </ScrollReveal>
        <div className="api-grid">
          {endpoints.map((ep, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="api-card">
                <div className="api-top">
                  <span className={`api-method ${ep.badge}`}>{ep.method}</span>
                  <code className="api-path">{ep.path}</code>
                </div>
                <p className="api-desc">{ep.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal delay={400}>
          <div className="api-cta-row">
            <a href="#" className="btn-ghost light">
              Ver Documentación Completa →
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Catalina Vergara M.',
      role: 'Socia, Vergara & Asociados',
      quote:
        'Redujo nuestro tiempo de primera lectura de contratos en un 70%. Lo que antes tomaba una mañana completa ahora se resuelve antes del café.',
      initials: 'CV',
    },
    {
      name: 'Rodrigo Espinoza L.',
      role: 'Jefe Legal, Grupo Alterra',
      quote:
        'La precisión en la detección de cláusulas abusivas es notable. Nos ha ahorrado dolores de cabeza reales en contratos de proveedores.',
      initials: 'RE',
    },
    {
      name: 'María José Contreras',
      role: 'Abogada Independiente',
      quote:
        'Como abogada independiente, no tengo equipo para delegar la primera revisión. Legal Agent CL se convirtió en mi primer filtro de confianza.',
      initials: 'MC',
    },
  ];

  return (
    <section className="testimonials-section" id="testimonios">
      <div className="container">
        <ScrollReveal>
          <h2 className="sec-title">Lo que Dicen Nuestros Usuarios</h2>
        </ScrollReveal>
        <div className="test-grid">
          {testimonials.map((t, i) => (
            <ScrollReveal key={i} delay={i * 120}>
              <div className="test-card">
                <div className="test-quote">&ldquo;{t.quote}&rdquo;</div>
                <div className="test-author">
                  <div className="test-avatar">{t.initials}</div>
                  <div className="test-info">
                    <span className="test-name">{t.name}</span>
                    <span className="test-role">{t.role}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Final ─── */

function CTAFinalSection() {
  return (
    <section className="cta-final">
      <div className="cta-bg" aria-hidden="true">
        <div className="cta-glow" />
      </div>
      <div className="container cta-inner">
        <ScrollReveal>
          <h2 className="cta-headline">
            Transforma tu
            <br />
            Práctica Legal
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <p className="cta-sub">
            Únete a las firmas chilenas que ya revisan contratos con inteligencia
            artificial.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={220}>
          <button
            className="btn-gold large"
            style={{ background: 'var(--gold)' }}
          >
            Comenzar Ahora
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ─── Footer ─── */

function FooterSection() {
  const cols = [
    {
      title: 'Producto',
      links: ['Análisis de Contratos', 'API', 'Precios', 'Changelog'],
    },
    { title: 'Empresa', links: ['Nosotros', 'Blog', 'Carreras', 'Contacto'] },
    {
      title: 'Legal',
      links: ['Términos de Uso', 'Política de Privacidad', 'SLA'],
    },
    {
      title: 'Contacto',
      links: ['hola@legalagent.cl', '+56 2 2345 6789', 'Santiago, Chile'],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="footer-logo">
              Legal Agent <span style={{ color: 'var(--gold)' }}>CL</span>
            </span>
            <p className="footer-tagline">
              Inteligencia artificial para la revisión de contratos comerciales
              en Chile.
            </p>
          </div>
          <div className="footer-cols">
            {cols.map((col, i) => (
              <div key={i} className="footer-col">
                <h4 className="footer-col-title">{col.title}</h4>
                <ul className="footer-links">
                  {col.links.map((l, j) => (
                    <li key={j}>
                      <a href="#">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Legal Agent CL — Santiago, Chile</span>
          <span>Hecho con precisión para el derecho chileno</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main App ─── */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <MetricsSection />
        <HowItWorksSection />
        <ProductDemoSection />
        <APISection />
        <TestimonialsSection />
        <CTAFinalSection />
      </main>
      <FooterSection />
    </>
  );
}

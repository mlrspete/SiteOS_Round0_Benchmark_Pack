import { content } from './content'

function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Gridline Field Services home">
          <strong>{content.brand}</strong>
          <span>{content.descriptor}</span>
        </a>
        <nav aria-label="Primary navigation">
          {content.nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <button type="button" data-testid="scope-review-open">{content.hero.primaryAction}</button>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>{content.hero.title}</h1>
          <p>{content.hero.body}</p>
          <a href="#services">{content.hero.secondaryAction}</a>
        </section>

        <section id="services" className="services">
          <p className="eyebrow">{content.servicesIntro.eyebrow}</p>
          <h2>{content.servicesIntro.title}</h2>
          <p>{content.servicesIntro.body}</p>
          <div className="service-grid">
            {content.services.map((service) => (
              <article key={service.id} data-testid={`service-card-${service.id}`}>
                <p>{service.discipline}</p>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

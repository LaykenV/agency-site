import Image from "next/image";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { LeadDemo } from "@/lib/lead-demos";
import styles from "./lead-demo.module.css";

type LeadDemoPageProps = {
  demo: LeadDemo;
};

export function LeadDemoPage({ demo }: LeadDemoPageProps) {
  return (
    <div className={styles.page} data-theme="garden">
      <aside className={styles.conceptBar} aria-label="Website concept notice">
        <span>Unlisted website concept for {demo.businessName}</span>
        <span>Prepared by Acadiana Web Design</span>
      </aside>

      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label={`${demo.businessName} home`}>
          <Image
            className={styles.brandLogo}
            src={demo.logo.src}
            alt=""
            width={72}
            height={72}
            priority
          />
          <span>
            <strong>{demo.businessName}</strong>
            <small>{demo.tagline}</small>
          </span>
        </a>
        <a
          aria-label={`Call ${demo.phoneDisplay}`}
          className={styles.headerCall}
          href={demo.phoneHref}
        >
          <Phone aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>Call {demo.phoneDisplay}</span>
        </a>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.locationLine}>
              <MapPin aria-hidden="true" size={18} strokeWidth={1.8} />
              {demo.location}
            </p>
            <h1>{demo.headline}</h1>
            <p className={styles.heroDescription}>{demo.description}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href={demo.phoneHref}>
                <Phone aria-hidden="true" size={19} strokeWidth={1.8} />
                Call for a free quote
              </a>
              <a className={styles.textAction} href={demo.smsHref}>
                <MessageCircle aria-hidden="true" size={19} strokeWidth={1.8} />
                Text Shay
              </a>
            </div>
            <p className={styles.serviceArea}>{demo.serviceArea}</p>
          </div>

          <figure className={styles.heroFigure}>
            <Image
              src={demo.hero.src}
              alt={demo.hero.alt}
              fill
              sizes="(max-width: 960px) 100vw, 48vw"
              priority
            />
            <figcaption>{demo.hero.caption}</figcaption>
          </figure>
        </section>

        <section className={styles.proof} aria-labelledby="proof-title">
          <div>
            <span className={styles.proofScore}>{demo.recommendation.score}</span>
            <h2 id="proof-title">recommended by local customers.</h2>
          </div>
          <p>
            {demo.recommendation.count} currently appear on {" "}
            <a href={demo.recommendation.sourceHref} target="_blank" rel="noreferrer">
              {demo.recommendation.sourceLabel}
            </a>
            . The care is already visible; this concept gives it a proper home online.
          </p>
        </section>

        <section className={styles.services} id="services" aria-labelledby="services-title">
          <div className={styles.sectionIntro}>
            <h2 id="services-title">Cleaning that fits the life around it.</h2>
            <p>
              Start with the room, routine, or reset that would make the biggest difference.
            </p>
          </div>
          <dl className={styles.serviceList}>
            {demo.services.map((service) => (
              <div key={service.name}>
                <dt>{service.name}</dt>
                <dd>{service.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.work} id="work" aria-labelledby="work-title">
          <div className={styles.workHeading}>
            <h2 id="work-title">The details tell the story.</h2>
            <p>A recent oven deep clean, photographed by Shay’s Cleaning Services.</p>
          </div>
          <div className={styles.workGrid}>
            {demo.work.map((image, index) => (
              <figure className={styles.workFigure} key={image.src} data-position={index + 1}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 40vw"
                />
                <figcaption>{image.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className={styles.process} aria-labelledby="process-title">
          <div className={styles.sectionIntro}>
            <h2 id="process-title">A simple way to get started.</h2>
            <p>No long intake process. Begin with a call or text and the space you want help with.</p>
          </div>
          <ol className={styles.steps}>
            {demo.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.finalCta} aria-labelledby="contact-title">
          <div>
            <h2 id="contact-title">What would feel better clean?</h2>
            <p>Tell Shay what you have in mind and ask for a free quote.</p>
          </div>
          <div className={styles.contactLinks}>
            <a href={demo.phoneHref}>
              <Phone aria-hidden="true" size={20} strokeWidth={1.8} />
              {demo.phoneDisplay}
            </a>
            <a href={`mailto:${demo.email}`}>{demo.email}</a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p className={styles.signoff}>
          With care,
          <br />
          <span>Shay’s Cleaning Services</span>
        </p>
        <p className={styles.previewNote}>
          Concept preview only—not the business’s live website. Content and service details would be
          confirmed with Shay before launch.
        </p>
      </footer>
    </div>
  );
}

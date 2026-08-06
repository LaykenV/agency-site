import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { LeadDemoSoftService } from "@/lib/lead-demos";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import styles from "./lead-demo.module.css";

type SoftServiceDemoPageProps = {
  demo: LeadDemoSoftService;
};

export function SoftServiceDemoPage({ demo }: SoftServiceDemoPageProps) {
  const scoreValue = Number.parseInt(demo.recommendation.score, 10);
  const scoreAnimates =
    Number.isFinite(scoreValue) && demo.recommendation.score.endsWith("%");

  return (
    <div className={styles.page}>
      <aside className={styles.conceptBar} aria-label="Website concept notice">
        <span>Unlisted website concept for {demo.businessName}</span>
        <Link className={styles.conceptBarLink} href={ONBOARDING_CAL_LINK}>
          Want this live? From $199/mo, no setup fee
        </Link>
      </aside>

      <header className={styles.siteHeader}>
        <a
          className={styles.brand}
          href="#top"
          aria-label={`${demo.businessName} home`}
        >
          <Image
            className={styles.brandLogo}
            src={demo.logo.src}
            alt=""
            width={88}
            height={88}
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
          <Phone aria-hidden="true" size={17} strokeWidth={1.8} />
          <span className={styles.headerCallLabel}>{demo.phoneDisplay}</span>
        </a>
      </header>

      <main id="top">
        <section className={styles.statHero}>
          <Image
            className={styles.heroMark}
            src={demo.logo.src}
            alt=""
            width={demo.logo.width}
            height={demo.logo.height}
            priority
          />
          <div className={styles.statHeroCopy}>
            <p className={styles.locationLine}>
              <MapPin aria-hidden="true" size={15} strokeWidth={1.8} />
              {demo.location}
            </p>
            <h1 className={styles.statTitle}>
              <span aria-hidden="true" className={styles.statFigure}>
                {scoreAnimates ? (
                  <>
                    <span
                      className={styles.statDigits}
                      style={
                        { "--lead-stat-target": scoreValue } as CSSProperties
                      }
                    />
                    <span className={styles.statUnit}>%</span>
                  </>
                ) : (
                  demo.recommendation.score
                )}
              </span>
              <span className={styles.srOnly}>
                {demo.recommendation.score} of reviewers recommend{" "}
                {demo.businessName}.
              </span>
            </h1>
            <p className={styles.qualifier}>
              of reviewers on{" "}
              <a
                href={demo.recommendation.sourceHref}
                target="_blank"
                rel="noreferrer"
              >
                {demo.recommendation.sourceLabel}
              </a>{" "}
              recommend {demo.businessName} — {demo.recommendation.count} so
              far.
            </p>
            <div className={styles.heroActions}>
              <a
                className={`${styles.chip} ${styles.chipPrimary}`}
                href={demo.phoneHref}
              >
                <Phone aria-hidden="true" size={17} strokeWidth={1.8} />
                Call for a free quote
              </a>
              <a className={styles.chip} href={demo.smsHref}>
                <MessageCircle aria-hidden="true" size={17} strokeWidth={1.8} />
                Send a text
              </a>
            </div>
            <p className={styles.serviceArea}>{demo.serviceArea}</p>
          </div>
        </section>

        <section className={styles.statement} aria-labelledby="statement-title">
          <div className={styles.statementInner}>
            <h2 className={styles.statementHeading} id="statement-title">
              {demo.headline}
            </h2>
            <p className={styles.statementBody}>{demo.description}</p>
          </div>
        </section>

        <section
          className={styles.section}
          id="services"
          aria-labelledby="services-title"
        >
          <h2 className={styles.sectionHeading} id="services-title">
            Cleaning that fits the life around it.
          </h2>
          <p className={styles.sectionSub}>
            Start with the room, routine, or reset that would make the biggest
            difference.
          </p>
          <dl className={styles.serviceList}>
            {demo.services.map((service) => (
              <div className={styles.serviceRow} key={service.name}>
                <dt>{service.name}</dt>
                <dd>{service.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className={styles.section}
          id="work"
          aria-labelledby="work-title"
        >
          <h2 className={styles.sectionHeading} id="work-title">
            The details tell the story.
          </h2>
          <p className={styles.sectionSub}>
            Real before-and-after photos, taken by {demo.businessName}.
          </p>
          <div className={styles.workGrid}>
            {demo.work.map((image) => (
              <figure className={styles.workFigure} key={image.src}>
                <span className={styles.workImageWrap}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </span>
                <figcaption>{image.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="process-title">
          <h2 className={styles.sectionHeading} id="process-title">
            A simple way to get started.
          </h2>
          <ol className={styles.steps}>
            {demo.steps.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={`${styles.section} ${styles.contact}`}
          aria-labelledby="contact-title"
        >
          <h2 className={styles.sectionHeading} id="contact-title">
            What would feel better clean?
          </h2>
          <p className={styles.sectionSub}>
            Call or text with the space you have in mind and ask for a free
            quote.
          </p>
          <div className={styles.contactLinks}>
            <a className={styles.contactPhone} href={demo.phoneHref}>
              <Phone aria-hidden="true" size={26} strokeWidth={1.8} />
              {demo.phoneDisplay}
            </a>
            <a className={styles.contactEmail} href={`mailto:${demo.email}`}>
              {demo.email}
            </a>
          </div>
        </section>

        <aside
          className={styles.awdBand}
          aria-label="Offer from Acadiana Web Design"
        >
          <div className={styles.awdInner}>
            <p className={styles.awdKicker}>Prepared by Acadiana Web Design</p>
            <p className={styles.awdOffer}>
              Want this live? From $199/mo, no setup fee.
            </p>
            <p className={styles.awdDetail}>
              $0 down — hosting, domain, unlimited edits, and support included
              with a 12-month commitment. Launch-ready in days, not months.
            </p>
            <Link className={styles.awdCta} href={ONBOARDING_CAL_LINK}>
              See how it works
            </Link>
          </div>
        </aside>
      </main>

      <footer className={styles.footer}>
        <p className={styles.signoff}>
          With care,
          <br />
          <span>{demo.businessName}</span>
        </p>
        <p className={styles.previewNote}>
          Concept preview only — not the business’s live website. Content and
          service details would be confirmed with the owner before launch.
        </p>
      </footer>
    </div>
  );
}

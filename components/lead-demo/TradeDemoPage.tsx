import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import type { LeadDemoTradeField } from "@/lib/lead-demos";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import styles from "./trade-demo.module.css";

type TradeDemoPageProps = {
  demo: LeadDemoTradeField;
};

export function TradeDemoPage({ demo }: TradeDemoPageProps) {
  return (
    <div className={`lead-theme-trade ${styles.page}`}>
      <aside className={styles.conceptBar} aria-label="Website concept notice">
        <span>Unlisted website concept for {demo.businessName}</span>
        <Link className={styles.conceptBarLink} href={ONBOARDING_CAL_LINK}>
          Want this live? From $199/mo, no setup fee
        </Link>
      </aside>

      <header className={styles.masthead}>
        <a
          className={styles.mastheadBrand}
          href="#top"
          aria-label={`${demo.businessName} home`}
        >
          <Image
            className={styles.mastheadMark}
            src={demo.logo.src}
            alt=""
            width={152}
            height={152}
            priority
          />
          <span className={styles.wordmark}>{demo.businessName}</span>
        </a>
        <p className={styles.credential}>{demo.credential}</p>
      </header>

      <main id="top">
        <figure className={styles.heroFold}>
          <span className={styles.heroFrame}>
            <Image
              src={demo.hero.src}
              alt={demo.hero.alt}
              width={demo.hero.width}
              height={demo.hero.height}
              sizes={`(max-width: ${demo.hero.width}px) 100vw, ${demo.hero.width}px`}
              priority
            />
          </span>
          <figcaption className={styles.heroCaption}>
            {demo.hero.caption}
          </figcaption>
        </figure>

        <section className={styles.textBand} aria-labelledby="lede-title">
          <div className={styles.ledeGrid}>
            <h1 className={styles.ledeHeading} id="lede-title">
              {demo.lede.heading}
            </h1>
            <p className={styles.ledeBody}>{demo.lede.body}</p>
          </div>
          <div className={styles.actions}>
            <a className={styles.action} href={demo.phoneHref}>
              <span className={styles.actionLabel}>
                Call {demo.phoneDisplay}
              </span>
              <span aria-hidden="true" className={styles.actionArrow}>
                →
              </span>
            </a>
            <a
              className={`${styles.action} ${styles.actionSecondary}`}
              href={demo.smsHref}
            >
              <span className={styles.actionLabel}>Send a text</span>
              <span aria-hidden="true" className={styles.actionArrow}>
                →
              </span>
            </a>
          </div>
        </section>

        {demo.plates[0] ? <Plate image={demo.plates[0]} /> : null}

        <section
          className={styles.textBand}
          id="scope"
          aria-labelledby="scope-title"
        >
          <h2 className={styles.scopeHeading} id="scope-title">
            {demo.scope.heading}
          </h2>
          <p className={styles.scopeNote}>{demo.scope.note}</p>
          <dl className={styles.specSheet}>
            {demo.services.map((service) => (
              <div className={styles.specRow} key={service.name}>
                <dt>{service.name}</dt>
                <dd>{service.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        {demo.plates.slice(1).map((image) => (
          <Plate image={image} key={image.src} />
        ))}

        <section
          className={styles.startingBand}
          aria-labelledby="starting-title"
        >
          <div className={`${styles.textBand} ${styles.startingGrid}`}>
            <h2 className={styles.startingHeading} id="starting-title">
              {demo.starting.heading}
            </h2>
            {demo.starting.body.map((paragraph) => (
              <p className={styles.startingBody} key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section
          className={styles.contactPlate}
          aria-labelledby="contact-title"
        >
          <div className={styles.contactInner}>
            <h2 className={styles.contactHeading} id="contact-title">
              {demo.contact.heading}
            </h2>
            <a className={styles.contactPhone} href={demo.phoneHref}>
              {demo.phoneDisplay}
            </a>
            <p className={styles.contactNote}>{demo.contact.note}</p>
            <div className={styles.contactActions}>
              <a className={styles.contactText} href={demo.smsHref}>
                <span className={styles.actionLabel}>Send a text instead</span>
                <span aria-hidden="true" className={styles.actionArrow}>
                  →
                </span>
              </a>
            </div>
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
              <span className={styles.actionLabel}>See how it works</span>
              <span aria-hidden="true" className={styles.actionArrow}>
                →
              </span>
            </Link>
          </div>
        </aside>
      </main>

      <footer className={styles.footer}>
        <p className={styles.colophon}>
          <span>{demo.businessName}</span>
          <span>{demo.location}</span>
          <span>{demo.phoneDisplay}</span>
        </p>
        <p className={styles.previewNote}>
          Concept preview only — not the business’s live website. The logo,
          photographs, services, and license number come from the business’s own
          Facebook page; the wording here was drafted for this concept and would
          be confirmed with the owner — along with service area and anything
          else stated — before launch.
        </p>
      </footer>

      <a className={styles.callBar} href={demo.phoneHref}>
        <Phone aria-hidden="true" size={18} strokeWidth={2} />
        Call {demo.phoneDisplay}
      </a>
    </div>
  );
}

function Plate({ image }: { image: LeadDemoTradeField["plates"][number] }) {
  return (
    <figure className={styles.plate}>
      <span className={styles.plateFrame}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 640px) 100vw, 608px"
          loading="lazy"
        />
      </span>
      <figcaption className={styles.plateCaption}>{image.caption}</figcaption>
    </figure>
  );
}

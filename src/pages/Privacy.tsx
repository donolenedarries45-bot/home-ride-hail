import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="size-4" /> Back
        </Link>

        <h1 className="font-display text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-2">Last updated: 1 May 2026</p>
        <p className="text-xs text-muted-foreground mb-10 italic">
          This policy is drafted in line with the Protection of Personal Information Act, 2013 (POPIA)
          and is currently in beta. A final version will be reviewed by a South African legal practitioner
          before public launch.
        </p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">1. Who we are (Responsible Party)</h2>
            <p className="text-muted-foreground leading-relaxed">
              KYK N LYN ("we", "us", "our") is a community ride-sharing platform operating in Elsies River,
              South Africa. For the purposes of POPIA, we are the <strong>Responsible Party</strong> in
              respect of your personal information.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Information Officer:</strong> [Founder name to be inserted]<br />
              <strong>Email:</strong> <a href="mailto:info-officer@kyknlyn.co.za" className="text-primary underline">info-officer@kyknlyn.co.za</a><br />
              Our Information Officer will be registered with the Information Regulator of South Africa
              prior to public launch.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">2. Our POPIA commitment</h2>
            <p className="text-muted-foreground leading-relaxed">
              We process your personal information in line with the eight conditions for lawful
              processing under POPIA: accountability, processing limitation, purpose specification,
              further processing limitation, information quality, openness, security safeguards, and
              data subject participation.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">3. What we collect</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
              <li><strong>Account info:</strong> name, email, phone number, profile photo.</li>
              <li><strong>Driver info (special personal information):</strong> ID document, driver's licence, vehicle registration and photos.</li>
              <li><strong>Location data:</strong> pickup and dropoff addresses, and live GPS location during an active ride (drivers only).</li>
              <li><strong>Trip history:</strong> rides taken or driven, fares, ratings, notes.</li>
              <li><strong>Device info:</strong> basic browser and device data for security and debugging.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">4. Why we collect it & legal basis</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
              <li><strong>Account info</strong> — to create and operate your account. <em>Basis: contract performance.</em></li>
              <li><strong>Driver verification documents</strong> — to verify driver identity and protect riders. <em>Basis: explicit consent + legitimate interest in community safety.</em></li>
              <li><strong>Location data</strong> — to match riders with nearby drivers and enable live trip tracking. <em>Basis: contract performance + consent.</em></li>
              <li><strong>Trip history</strong> — for receipts, dispute resolution and safety. <em>Basis: contract + legal obligation.</em></li>
              <li><strong>Device info</strong> — to keep the platform secure. <em>Basis: legitimate interest.</em></li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">5. Special personal information (driver IDs)</h2>
            <p className="text-muted-foreground leading-relaxed">
              In terms of POPIA Section 26, identity documents are "special personal information". We
              process this only with your <strong>explicit consent</strong> given during driver onboarding,
              for the sole purpose of verifying your identity. ID documents are stored encrypted, accessed
              only by our verification administrators, and never shared with riders or third parties
              except where required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">6. Children</h2>
            <p className="text-muted-foreground leading-relaxed">
              In terms of POPIA Section 34, we do not knowingly collect personal information of any
              person under the age of 18. The platform is restricted to adults only. If we discover
              we have collected a child's data, we will delete it immediately. Contact our Information
              Officer if you believe we hold a minor's data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">7. Sharing your data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share the minimum information needed for a ride to happen — for example, a rider's
              first name and pickup address with the assigned driver. <strong>We do not sell your data.</strong>{" "}
              We may share information with law enforcement or regulators if legally required.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">8. Cross-border transfer</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our platform runs on cloud infrastructure (Supabase, hosted in the European Union) which
              means your personal information may be stored or processed outside South Africa. In terms
              of POPIA Section 72, the EU provides adequate data protection through the GDPR, which
              offers protection comparable to or stronger than POPIA.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">9. Live location data</h2>
            <p className="text-muted-foreground leading-relaxed">
              A driver's live GPS location is only broadcast while a ride is active and is visible only
              to the matched rider. Location updates stop the moment the ride ends or is cancelled. We
              do not track drivers or riders outside of an active trip.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">10. Cookies & tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use only essential cookies and local browser storage required to keep you signed in
              and to operate the app. We do not use advertising cookies or third-party trackers. If we
              ever introduce analytics, we'll update this policy and ask for your consent first.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">11. Data security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored on secure cloud infrastructure with row-level security policies,
              encrypted in transit (HTTPS) and at rest. Only you and authorised parties (your matched
              driver, our verification admins) can access your information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">12. Data breach notification</h2>
            <p className="text-muted-foreground leading-relaxed">
              In terms of POPIA Section 22, if a security compromise reasonably believed to put your
              personal information at risk occurs, we will notify both you and the Information
              Regulator as soon as reasonably possible.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">13. Your rights & withdrawing consent</h2>
            <p className="text-muted-foreground leading-relaxed">
              Under POPIA you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction or deletion of inaccurate data</li>
              <li>Object to processing or withdraw consent at any time</li>
              <li>Lodge a complaint with the Information Regulator</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@kyknlyn.co.za" className="text-primary underline">privacy@kyknlyn.co.za</a>.
              You can withdraw consent for non-essential processing at any time; note that withdrawing
              consent for essential data (e.g., your name, location during a ride) will mean we can no
              longer provide the service to you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">14. Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We keep trip and account data for as long as your account is active and for a reasonable
              period afterward (typically 5 years) to comply with tax, legal, and safety obligations,
              after which it is deleted or anonymised.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">15. Complaints to the Regulator</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are not satisfied with how we handle your personal information, you have the right
              to lodge a complaint with the Information Regulator of South Africa:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong>Information Regulator (South Africa)</strong><br />
              JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001<br />
              Email: <a href="mailto:inforeg@justice.gov.za" className="text-primary underline">inforeg@justice.gov.za</a><br />
              Complaints: <a href="mailto:complaints.IR@justice.gov.za" className="text-primary underline">complaints.IR@justice.gov.za</a><br />
              Website: <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer" className="text-primary underline">inforegulator.org.za</a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">16. Contact us</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about your privacy? Reach our Information Officer at{" "}
              <a href="mailto:privacy@kyknlyn.co.za" className="text-primary underline">privacy@kyknlyn.co.za</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

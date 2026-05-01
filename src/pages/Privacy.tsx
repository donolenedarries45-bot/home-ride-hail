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
        <p className="text-sm text-muted-foreground mb-10">Last updated: 1 May 2026</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">1. Who we are</h2>
            <p className="text-muted-foreground leading-relaxed">
              KYK N LYN is a community ride-sharing platform operating in South Africa. We take your
              privacy seriously and comply with the Protection of Personal Information Act (POPIA).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">2. What we collect</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
              <li><strong>Account info:</strong> name, email, phone number, profile photo.</li>
              <li><strong>Driver info:</strong> ID document, driver's licence, vehicle registration and photos.</li>
              <li><strong>Location data:</strong> pickup and dropoff addresses, and live GPS location during an active ride (drivers only).</li>
              <li><strong>Trip history:</strong> rides you've taken or driven, fares, ratings.</li>
              <li><strong>Device info:</strong> basic browser and device data for security and debugging.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">3. How we use it</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
              <li>To match riders with verified neighborhood drivers.</li>
              <li>To show drivers the rider's pickup location and vice versa during a trip.</li>
              <li>To verify driver identity and keep the community safe.</li>
              <li>To process and display fare estimates.</li>
              <li>To improve the service and respond to support requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">4. Sharing your data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We share the minimum information needed for a ride to happen — for example, a rider's
              first name and pickup address with the assigned driver. We do not sell your data. We may
              share information with law enforcement if legally required.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">5. Location data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Live driver location is only broadcast while a ride is active and is visible only to the
              matched rider. Location updates stop the moment the ride ends or is cancelled.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">6. Data security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored on secure cloud infrastructure with row-level security so only you
              and authorised parties (e.g., your matched driver, our admins for verification) can
              access your information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">7. Your rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Under POPIA you have the right to access, correct, or delete your personal information.
              Email <a href="mailto:privacy@kyknlyn.co.za" className="text-primary underline">privacy@kyknlyn.co.za</a> to make a request.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">8. Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We keep trip and account data for as long as your account is active and for a reasonable
              period afterward to comply with legal and safety obligations.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about your privacy? Reach us at <a href="mailto:privacy@kyknlyn.co.za" className="text-primary underline">privacy@kyknlyn.co.za</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

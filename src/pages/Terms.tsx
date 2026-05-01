import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="size-4" /> Back
        </Link>

        <h1 className="font-display text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: 1 May 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">1. About KYK N LYN</h2>
            <p className="text-muted-foreground leading-relaxed">
              KYK N LYN ("we", "us", "our") is a community ride-sharing platform that connects verified
              neighbors within designated areas (currently Elsies River, South Africa) for local trips.
              By using the app you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use KYK N LYN. Drivers must additionally hold a
              valid South African driver's licence, valid vehicle registration, and pass our community
              verification process.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">3. The service</h2>
            <p className="text-muted-foreground leading-relaxed">
              KYK N LYN is a technology platform that introduces riders to drivers. We are not a
              transportation provider. Drivers are independent and responsible for their own vehicles,
              insurance, and conduct.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">4. Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fares are paid in cash directly to the driver at the end of each trip unless otherwise
              stated. The fare shown in the app is an estimate based on distance and duration. Final
              fare may vary slightly based on the actual route taken.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">5. Cancellations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Riders and drivers may cancel a ride before pickup. Repeated cancellations may result in
              temporary suspension to protect the community.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">6. Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to treat other community members with respect. Harassment, discrimination,
              violence, intoxication, or any illegal activity will result in immediate and permanent
              removal from the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">7. Limitation of liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, KYK N LYN is not liable for any incident,
              injury, loss, or damage arising from a trip. Drivers are independent operators.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">8. Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Continued use of the app means you accept
              the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions? Reach us at <a href="mailto:hello@kyknlyn.co.za" className="text-primary underline">hello@kyknlyn.co.za</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

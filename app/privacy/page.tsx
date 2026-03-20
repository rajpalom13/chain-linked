import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy – ChainLinked",
  description:
    "ChainLinked Privacy Policy – how we collect, use, and protect your data.",
};

const LAST_UPDATED = "March 17, 2026";
const CONTACT_EMAIL = "support@higherops.io";
const APP_URL = "https://chainlinked.ai";

/**
 * Privacy Policy page for ChainLinked.
 *
 * Covers both the web application and the ChainLinked Data Connector
 * Chrome extension (Chrome Web Store ID: glieaipgcfjjgkpodaonlmappefjbhep).
 *
 * @returns Static server-rendered privacy policy page
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href={APP_URL} className="text-xl font-semibold tracking-tight">
            ChainLinked
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to app
          </Link>
        </div>
      </div>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="1. Who We Are">
          <p>
            ChainLinked (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or
            &ldquo;us&rdquo;) is a LinkedIn content management platform for
            individuals and teams, operated by HigherOps Inc.. Our web application is
            available at{" "}
            <a href={APP_URL} className="underline">
              chainlinked.ai
            </a>{" "}
            and we publish the{" "}
            <strong>ChainLinked Data Connector</strong> Chrome extension (the
            &ldquo;Extension&rdquo;) on the Chrome Web Store.
          </p>
          <p>
            Questions about this policy can be sent to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Scope">
          <p>This policy applies to:</p>
          <ul>
            <li>
              The ChainLinked web application at{" "}
              <a href={APP_URL} className="underline">
                chainlinked.ai
              </a>
            </li>
            <li>
              The ChainLinked Data Connector Chrome extension
            </li>
            <li>Any APIs or services operated by ChainLinked</li>
          </ul>
          <p>
            It does not apply to third-party services you connect to ChainLinked
            (such as LinkedIn or Google), which have their own privacy policies.
          </p>
        </Section>

        <Section title="3. Data We Collect">
          <h3 className="text-lg font-semibold mt-6 mb-2">
            3a. Data collected through the Chrome Extension
          </h3>
          <p>
            The Extension operates entirely within your own LinkedIn session. It
            captures data that you have already generated or have access to on
            LinkedIn — it cannot access other users&apos; private data. The
            following categories are collected:
          </p>
          <Table
            headers={["Category", "Examples", "Purpose"]}
            rows={[
              [
                "Profile data",
                "Name, headline, location, profile photo URL, LinkedIn member ID, public identifier",
                "Display your profile in the ChainLinked dashboard",
              ],
              [
                "Analytics data",
                "Post impressions, profile views, follower growth, engagement rates",
                "Populate your personal and team analytics dashboard",
              ],
              [
                "Post & content data",
                "Post text, media URLs, reactions, comments, reposts, per-post metrics",
                "Track content performance and build your post library",
              ],
              [
                "Audience demographics",
                "Follower job titles, industries, companies, geographic regions",
                "Display audience insights in the dashboard",
              ],
              [
                "Network data",
                "Connection count, follower count, invitation metadata",
                "Network growth tracking",
              ],
              [
                "Feed posts",
                "Posts from connections visible in your LinkedIn feed",
                "Populate the team activity feed and inspiration features",
              ],
              [
                "Messaging metadata",
                "Conversation counts, unread counts (message content is not stored by default)",
                "Optional — only if messaging capture is enabled in settings",
              ],
              [
                "Authentication tokens",
                "LinkedIn session cookies (li_at, JSESSIONID, lidc, bcookie)",
                "Authenticate requests to LinkedIn's internal API on your behalf",
              ],
              [
                "Google OAuth tokens",
                "Google account ID, email address, display name",
                "Sign in to ChainLinked using your Google account",
              ],
            ]}
          />

          <h3 className="text-lg font-semibold mt-8 mb-2">
            3b. Data collected through the web application
          </h3>
          <ul>
            <li>
              <strong>Account information:</strong> Email address, password
              (hashed), team membership, and role.
            </li>
            <li>
              <strong>Content you create:</strong> Posts you draft, schedule, or
              publish through ChainLinked; templates; carousel files.
            </li>
            <li>
              <strong>Usage data:</strong> Pages visited, features used, and
              actions taken within the app (used for product improvement).
            </li>
            <li>
              <strong>Technical data:</strong> IP address, browser type, and
              device type collected automatically by our infrastructure.
            </li>
          </ul>
        </Section>

        <Section title="4. How We Use Your Data">
          <ul>
            <li>Provide and operate the ChainLinked platform and Extension</li>
            <li>
              Display your LinkedIn analytics, posts, and audience data in your
              dashboard
            </li>
            <li>Enable team analytics and collaborative content features</li>
            <li>
              Generate AI-powered content suggestions based on your own post
              history and style
            </li>
            <li>Authenticate you with LinkedIn and Google</li>
            <li>Send product notifications and sync status alerts</li>
            <li>Improve the product based on usage patterns</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="mt-4 font-medium">
            We do not sell your data. We do not use your data for advertising.
            We do not use your data to determine creditworthiness or for lending
            purposes.
          </p>
        </Section>

        <Section title="5. LinkedIn Session Cookies">
          <p>
            The Extension captures your LinkedIn session cookies (
            <code>li_at</code>, <code>JSESSIONID</code>) to make authenticated
            API requests to LinkedIn on your behalf. These cookies are:
          </p>
          <ul>
            <li>
              Stored in our database associated with your ChainLinked account
            </li>
            <li>
              Used solely to retrieve your own LinkedIn data (not anyone
              else&apos;s)
            </li>
            <li>
              Never shared with third parties
            </li>
            <li>
              Treated as sensitive credentials — access is restricted by
              row-level security policies in our database
            </li>
            <li>
              Automatically invalidated when your LinkedIn session expires
              (typically 60 days)
            </li>
          </ul>
          <p>
            You can revoke access at any time by disconnecting LinkedIn in
            ChainLinked Settings, which deletes all stored session tokens.
          </p>
        </Section>

        <Section title="6. Data Sharing">
          <p>We share data only in the following limited circumstances:</p>
          <ul>
            <li>
              <strong>Within your team:</strong> Analytics and post data may be
              visible to other members of your ChainLinked team, as that is a
              core feature of the product.
            </li>
            <li>
              <strong>Service providers:</strong> We use Supabase for database
              and authentication infrastructure. Data is stored on Supabase
              servers in the ap-south-1 (Mumbai) region. Supabase processes data
              under its own privacy and security policies.
            </li>
            <li>
              <strong>AI providers:</strong> Content and style data may be sent
              to AI providers (such as Anthropic or OpenAI) to generate content
              suggestions. Prompts are not used to train third-party models under
              our current API agreements.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose data if
              required by law, court order, or to protect the rights and safety
              of ChainLinked or its users.
            </li>
          </ul>
          <p>
            We do not sell, rent, or trade your personal data to third parties.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li>
              Captured LinkedIn data is retained as long as your account is
              active.
            </li>
            <li>
              LinkedIn session cookies are deleted when you disconnect LinkedIn
              or close your account.
            </li>
            <li>
              You can request deletion of all your data at any time by emailing{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
              .
            </li>
            <li>
              Upon account deletion, all personal data is permanently removed
              within 30 days.
            </li>
          </ul>
        </Section>

        <Section title="8. Your Rights">
          <p>
            Depending on your location, you may have the following rights
            regarding your personal data:
          </p>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of the data we hold about
              you.
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate
              data.
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your data.
            </li>
            <li>
              <strong>Portability:</strong> Request your data in a
              machine-readable format.
            </li>
            <li>
              <strong>Objection:</strong> Object to certain uses of your data.
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            We implement industry-standard security measures including:
          </p>
          <ul>
            <li>Encrypted data transmission (TLS/HTTPS)</li>
            <li>
              Row-level security (RLS) policies restricting database access to
              the authenticated user&apos;s own data
            </li>
            <li>
              Authentication via Supabase Auth with support for Google OAuth2
            </li>
            <li>
              Sensitive credentials (session tokens) stored with restricted
              access controls
            </li>
          </ul>
          <p>
            No method of transmission or storage is 100% secure. If you
            discover a security vulnerability, please report it to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="10. Children">
          <p>
            ChainLinked is not directed at children under 16. We do not
            knowingly collect data from children. If you believe a child has
            provided us with personal data, contact us and we will delete it.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this policy from time to time. We will notify you of
            material changes by email or by displaying a notice in the app. The
            &ldquo;Last updated&rdquo; date at the top of this page reflects the
            most recent revision. Continued use of ChainLinked after changes
            take effect constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            For privacy questions or requests, contact us at:
          </p>
          <address className="not-italic mt-2 text-sm">
            <strong>ChainLinked / HigherOps Inc.</strong>
            <br />
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
          </address>
        </Section>
      </article>

      {/* Footer */}
      <div className="border-t mt-8">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} ChainLinked / HigherOps Inc.</span>
          <span>Last updated: {LAST_UPDATED}</span>
        </div>
      </div>
    </main>
  );
}

/* ─── Internal layout helpers ──────────────────────────────────────────────── */

/**
 * A labelled policy section with a divider.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}

/**
 * A simple responsive table for policy data categories.
 */
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left py-2 px-3 font-semibold text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-2 px-3 align-top text-foreground/75"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

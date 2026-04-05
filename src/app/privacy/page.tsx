export const metadata = {
  title: "Privacy Policy - Promptnud",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: April 2, 2026</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
          <p>
            Promptnud (&quot;we&quot;, &quot;our&quot;, &quot;the app&quot;) is a
            meeting scheduler designed for LINE groups. This policy describes how
            we collect, use, and protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>LINE profile data:</strong> display name, profile picture
              URL, and LINE user ID, obtained through the LIFF SDK when you open
              the app.
            </li>
            <li>
              <strong>Google Calendar data:</strong> calendar event information
              accessed with your explicit consent via Google OAuth, used solely
              to help schedule meetings.
            </li>
            <li>
              <strong>Meeting data:</strong> meeting titles, dates, time slots,
              and participant responses that you create or interact with.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            3. How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Authenticate you within the LINE app</li>
            <li>Display your profile to other meeting participants</li>
            <li>
              Read your Google Calendar availability to suggest meeting times
            </li>
            <li>Create and manage meeting schedules</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Data Sharing</h2>
          <p>
            We do not sell or share your personal information with third parties.
            Your data is only shared with other participants within meetings you
            join.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Data Storage</h2>
          <p>
            Your data is stored securely in our database. Authentication is
            handled via HTTP-only cookies. We do not store your Google or LINE
            access tokens long-term.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            6. Your Rights &amp; Data Deletion
          </h2>
          <p>
            You may revoke Google Calendar access at any time through your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account permissions
            </a>
            . To request deletion of your data, please contact us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
          <p>
            For questions about this privacy policy, please reach out through the
            LINE app or contact the app administrator.
          </p>
        </section>
      </div>
    </div>
  );
}

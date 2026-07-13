import { LegalShell, Section } from "./LegalPage";

export default function Terms() {
  return (
    <LegalShell title="Terms & Conditions" updated="2026-07-13">
      <Section title="1. What this is">
        <p>Project HIBARU is a remedial reading program tool used by Taft National High School (303529) to assign
        reading passages, run monitored oral-reading sessions, and generate Phil-IRI Form 3 assessment reports for
        teachers, students, and school administrators. By creating an account or using an account provided to you
        by your teacher or school, you agree to these Terms.</p>
      </Section>

      <Section title="2. Who can use it">
        <p>This system is limited to Taft National High School students, teachers, and authorized school
        administrators. Teacher accounts are self-registered and must be approved by a school admin before use.
        Student accounts are created only by a teacher inviting a specific learner; a parent or guardian may set up
        or supervise the account on the student's behalf, particularly for younger learners.</p>
      </Section>

      <Section title="3. Acceptable use">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Use the account only for its intended educational purpose — assigning, completing, and reviewing reading tasks.</li>
          <li>Do not share your password or let another person complete a reading task under your account.</li>
          <li>Do not upload content that is unrelated to coursework, offensive, or that infringes someone else's rights.</li>
          <li>Teachers are responsible for the accuracy of learner information they enter and for requesting removal of a learner's account when appropriate (e.g., transfer, withdrawal).</li>
        </ul>
      </Section>

      <Section title="4. Reading assessment & speech recognition">
        <p>The monitored-reading feature uses your device's camera preview and your browser's built-in speech
        recognition to capture a transcript of what you read aloud, which is used to score reading rate and detect
        likely reading errors (miscues). This is an automated approximation, not a certified diagnostic
        instrument — teachers should use professional judgment when interpreting results, and may override or
        annotate scores where appropriate.</p>
      </Section>

      <Section title="5. Account suspension">
        <p>The school admin may suspend or remove an account for misuse, at the request of a parent/guardian, or
        upon a student's withdrawal or a teacher's separation from the school.</p>
      </Section>

      <Section title="6. Changes to these Terms">
        <p>These Terms may be updated as the program evolves. Continued use of the system after an update
        constitutes acceptance of the revised Terms. Material changes affecting minors' data will be communicated
        to teachers and, where applicable, parents/guardians.</p>
      </Section>

      <Section title="7. Contact">
        <p>Questions about these Terms should be directed to the school administrator listed in the Admin Console,
        or to Taft National High School's designated Data Protection Officer (see the <a href="/privacy">Privacy Policy</a> for data-handling specifics).</p>
      </Section>
    </LegalShell>
  );
}

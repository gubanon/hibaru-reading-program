import { LegalShell, Section } from "./LegalPage";

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="2026-07-13">
      <Section title="1. Scope & legal basis">
        <p>This Privacy Policy explains how Project HIBARU collects, uses, and protects personal data, in line with
        the Philippines' Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and
        Regulations. Taft National High School acts as the Personal Information Controller for data processed
        through this system. Because much of this data belongs to minors, processing relies on the school's
        legitimate educational mandate and, where applicable, parental/guardian consent obtained through normal
        school enrollment processes — the school should confirm this basis is properly documented before go-live.</p>
      </Section>

      <Section title="2. What we collect">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><b>Account info:</b> name, email, role (teacher/student/admin), sex, grade & section, school/division/region.</li>
          <li><b>Classroom & assignment data:</b> classroom rosters, reading passages, comprehension questions, deadlines.</li>
          <li><b>Reading performance data:</b> reading time, words-per-minute, a speech-to-text transcript of monitored
          reading sessions, automatically detected miscues, comprehension quiz answers and scores.</li>
          <li><b>Uploaded files:</b> question sheets (.docx/.pdf) teachers upload to auto-populate assignments.</li>
          <li><b>Technical data:</b> login timestamps, session tokens — used only to keep you signed in.</li>
        </ul>
        <p style={{ marginTop: 10 }}>We do <b>not</b> record or store audio/video — the camera preview during monitored
        reading is local to the student's device and is never uploaded; only the text transcript produced by the
        browser's speech recognition is sent to the server.</p>
      </Section>

      <Section title="3. Why we collect it">
        <p>Solely to run the remedial reading program: assigning and grading reading tasks, generating Phil-IRI
        Form 3 records, tracking a learner's progress over time, and giving teachers and (via printed/exported
        reports) parents visibility into reading development.</p>
      </Section>

      <Section title="4. Who can see it">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>A student's own reading data is visible to that student, their teacher(s), and the school admin.</li>
          <li>A teacher can see rosters, assignments, and results only for their own classrooms.</li>
          <li>The school admin can see program-wide teacher and learner records for oversight purposes.</li>
          <li>Data is not sold, and is not shared with third parties outside the school except as required by law
          or DepEd reporting requirements.</li>
        </ul>
      </Section>

      <Section title="5. Third-party processing">
        <p>Speech-to-text transcription runs in the student's own browser (a built-in browser feature, not a
        third-party API call from our servers). DOCX report generation happens on our own server. If the school
        later hosts this system on a third-party cloud provider, that provider should be named here along with its
        role as a Personal Information Processor.</p>
      </Section>

      <Section title="6. Retention">
        <p>Reading records are retained for as long as the learner is enrolled and for the period required by DepEd
        record-keeping rules thereafter. The school should set and document a concrete retention/deletion schedule
        before production use.</p>
      </Section>

      <Section title="7. Security measures">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Passwords are hashed (bcrypt) — nobody at the school, including admins, can view a user's password.</li>
          <li>Sessions use signed, expiring tokens (JWT); accounts can be suspended immediately by an admin.</li>
          <li>Role-based access control — a teacher cannot see another teacher's classrooms; a student cannot see
          another student's data.</li>
          <li>Login attempts are rate-limited to reduce automated password-guessing.</li>
          <li>Uploaded files are restricted to expected types and sizes.</li>
        </ul>
      </Section>

      <Section title="8. Your rights">
        <p>Under RA 10173, data subjects (or a parent/guardian on a minor's behalf) may request access to,
        correction of, or erasure of their personal data, and may object to processing, subject to the school's
        legitimate educational record-keeping obligations. Requests should go through the school's designated Data
        Protection Officer.</p>
      </Section>

      <Section title="9. Contact / Data Protection Officer">
        <p>[School to fill in: name and contact details of Taft National High School's designated Data Protection
        Officer, per DepEd data privacy issuances.]</p>
      </Section>
    </LegalShell>
  );
}

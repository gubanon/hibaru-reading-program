import { useState } from "react";
import TopBar from "../../components/TopBar";
import { Pill } from "../../components/ui";
import ClassroomsTab from "./ClassroomsTab";
import NewAssignmentTab from "./NewAssignmentTab";
import AssignmentsTab from "./AssignmentsTab";
import ProgressTab from "./ProgressTab";
import AnalyticsTab from "./AnalyticsTab";

const TABS = [
  { id: "classes", label: "🏫 Classrooms" },
  { id: "new", label: "＋ New Assignment" },
  { id: "assignments", label: "🗂 Assignments" },
  { id: "progress", label: "📊 Progress Monitor" },
  { id: "analytics", label: "📈 Class Analytics" }
];

export default function TeacherConsole() {
  const [tab, setTab] = useState("classes");

  return (
    <div style={{ minHeight: "100vh", background: "#F6F5F1" }}>
      <TopBar roleLabel="👩‍🏫 Teacher" />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 28px 60px" }}>
        <div data-noprint="1" style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          {TABS.map(t => <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>)}
        </div>
        {tab === "classes" && <ClassroomsTab />}
        {tab === "new" && <NewAssignmentTab onCreated={() => setTab("assignments")} />}
        {tab === "assignments" && <AssignmentsTab />}
        {tab === "progress" && <ProgressTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}

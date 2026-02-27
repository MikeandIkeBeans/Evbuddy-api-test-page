import React, { useState } from "react";
import styles from "./styles";

import ServicesTab from "./components/ServicesTab";
import LiveChargersTab from "./components/LiveChargersTab";
import ActiveSessionsTab from "./components/ActiveSessionsTab";
import HostSitesTab from "./components/HostSitesTab";
import APITesterTab from "./components/APITesterTab";
import OperatingHoursTab from "./components/OperatingHoursTab";
import MessagingTab from "./components/MessagingTab";

const TABS = [
  { id: "services", label: "Services", component: ServicesTab },
  { id: "chargers", label: "Chargers", component: LiveChargersTab },
  { id: "sessions", label: "Sessions", component: ActiveSessionsTab },
  { id: "hostsites", label: "Host Sites", component: HostSitesTab },
  { id: "hours", label: "Hours", component: OperatingHoursTab },
  { id: "messaging", label: "Messaging", component: MessagingTab },
  { id: "tester", label: "API Tester", component: APITesterTab },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("services");
  const activeTabConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const ActiveTabComponent = activeTabConfig.component;

  return (
    <div style={styles.container} className="dashboard-shell">
      <div style={styles.header} className="dashboard-header">
        <div style={styles.headerCopy}>
          <div style={styles.logo}>EV Buddy</div>
          <div style={styles.subtitle}>Unified API Command Center</div>
        </div>
        <div style={styles.headerBadge}>Silicon-grade dashboard</div>
      </div>

      <div style={styles.tabs} className="dashboard-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab${activeTab === tab.id ? " is-active" : ""}`}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ActiveTabComponent />
    </div>
  );
}

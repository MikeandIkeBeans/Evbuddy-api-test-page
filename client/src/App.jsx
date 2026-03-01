import React, { useState } from "react";
import styles from "./styles";

import ServicesTab from "./components/ServicesTab";
import LiveChargersTab from "./components/LiveChargersTab";
import ActiveSessionsTab from "./components/ActiveSessionsTab";
import HostSitesTab from "./components/HostSitesTab";
import APITesterTab from "./components/APITesterTab";
import OperatingHoursTab from "./components/OperatingHoursTab";
import MessagingTab from "./components/MessagingTab";
import DriverInboxTab from "./components/DriverInboxTab";

const TABS = [
  { id: "services", label: "Services", component: ServicesTab },
  { id: "chargers", label: "Chargers", component: LiveChargersTab },
  { id: "sessions", label: "Sessions", component: ActiveSessionsTab },
  { id: "hostsites", label: "Host Sites", component: HostSitesTab },
  { id: "hours", label: "Hours", component: OperatingHoursTab },
  { id: "messaging", label: "Messaging", component: MessagingTab },
  { id: "inbox", label: "Driver Inbox", component: DriverInboxTab },
  { id: "tester", label: "API Tester", component: APITesterTab },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("services");
  const activeTabConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const ActiveTabComponent = activeTabConfig.component;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>EV Buddy</div>
        <div style={{ color: "#666", fontSize: 14 }}>API Dashboard</div>
      </div>

      <div style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ActiveTabComponent />
    </div>
  );
}

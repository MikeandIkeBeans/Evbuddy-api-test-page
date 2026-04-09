import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./styles";
import {
  Activity,
  BatteryCharging,
  Building2,
  Clock3,
  FlaskConical,
  Inbox,
  MessagesSquare,
  Wrench,
  Zap,
} from "lucide-react";

import ServicesTab from "./components/ServicesTab";
import LiveChargersTab from "./components/LiveChargersTab";
import ActiveSessionsTab from "./components/ActiveSessionsTab";
import HostSitesTab from "./components/HostSitesTab";
import APITesterTab from "./components/APITesterTab";
import OperatingHoursTab from "./components/OperatingHoursTab";
import MessagingTab from "./components/MessagingTab";
import DriverInboxTab from "./components/DriverInboxTab";
import V2VTab from "./components/V2VTab";
import { ScreenContainer, TabButton } from "./components/primitives";

const TAB_NAV_EVENT = "evbuddy:navigate-tab";
const TAB_HASH_PREFIX = "#tab=";

const TABS = [
  { id: "v2v", label: "V2V", group: "operations", icon: Zap, component: V2VTab },
  {
    id: "services",
    label: "Services",
    group: "operations",
    icon: Wrench,
    component: ServicesTab,
  },
  {
    id: "chargers",
    label: "Chargers",
    group: "operations",
    icon: BatteryCharging,
    component: LiveChargersTab,
  },
  {
    id: "sessions",
    label: "Sessions",
    group: "operations",
    icon: Activity,
    component: ActiveSessionsTab,
  },
  {
    id: "hostsites",
    label: "Host Sites",
    group: "platform",
    icon: Building2,
    component: HostSitesTab,
  },
  {
    id: "hours",
    label: "Hours",
    group: "platform",
    icon: Clock3,
    component: OperatingHoursTab,
  },
  {
    id: "messaging",
    label: "Messaging",
    group: "comms",
    icon: MessagesSquare,
    component: MessagingTab,
  },
  {
    id: "inbox",
    label: "Driver Inbox",
    group: "comms",
    icon: Inbox,
    component: DriverInboxTab,
  },
  {
    id: "tester",
    label: "API Tester",
    group: "tooling",
    icon: FlaskConical,
    component: APITesterTab,
  },
];

const TAB_GROUPS = [
  { id: "operations", label: "Operations" },
  { id: "platform", label: "Platform" },
  { id: "comms", label: "Messaging" },
  { id: "tooling", label: "Tools" },
];

const TAB_IDS = new Set(TABS.map((tab) => tab.id));
const DEFAULT_TAB_ID = TABS[0]?.id ?? "v2v";

const readHashTabId = () => {
  if (typeof window === "undefined") return "";
  if (!window.location.hash.startsWith(TAB_HASH_PREFIX)) return "";
  return decodeURIComponent(window.location.hash.slice(TAB_HASH_PREFIX.length));
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hashTabId = readHashTabId();
    return TAB_IDS.has(hashTabId) ? hashTabId : DEFAULT_TAB_ID;
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const tabsRef = useRef<HTMLElement | null>(null);
  const tabsByGroup = useMemo(
    () =>
      TAB_GROUPS.map((group) => ({
        ...group,
        tabs: TABS.filter((tab) => tab.group === group.id),
      })).filter((group) => group.tabs.length > 0),
    [],
  );

  useEffect(() => {
    const handleTabNavigation = (event: Event) => {
      const tabId = (event as CustomEvent<{ tabId?: string }>).detail?.tabId;
      if (!tabId || !TAB_IDS.has(tabId)) return;
      setActiveTab(tabId);
    };

    window.addEventListener(TAB_NAV_EVENT, handleTabNavigation);
    return () => {
      window.removeEventListener(TAB_NAV_EVENT, handleTabNavigation);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hashTabId = readHashTabId();
      if (!TAB_IDS.has(hashTabId)) return;
      setActiveTab(hashTabId);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextHash = `${TAB_HASH_PREFIX}${encodeURIComponent(activeTab)}`;
    if (window.location.hash === nextHash) return;

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${nextHash}`,
    );
  }, [activeTab]);

  const updateIndicator = () => {
    const tabsElement = tabsRef.current;
    const activeElement = document.getElementById(`tab-${activeTab}`);

    if (!(tabsElement instanceof HTMLElement) || !(activeElement instanceof HTMLElement)) {
      setIndicator((previous) =>
        previous.visible
          ? {
              ...previous,
              visible: false,
            }
          : previous,
      );
      return;
    }

    const tabsRect = tabsElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();
    const nextLeft = activeRect.left - tabsRect.left;
    const nextWidth = activeRect.width;

    setIndicator((previous) => {
      const samePosition =
        Math.abs(previous.left - nextLeft) < 0.5 && Math.abs(previous.width - nextWidth) < 0.5;
      if (samePosition && previous.visible) return previous;

      return {
        left: nextLeft,
        width: nextWidth,
        visible: true,
      };
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => updateIndicator();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTab]);

  const focusTab = (tabId: string) => {
    const tabElement = document.getElementById(`tab-${tabId}`);
    if (tabElement instanceof HTMLButtonElement) {
      tabElement.focus();
    }
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextTabId = TABS[(index + 1) % TABS.length].id;
      setActiveTab(nextTabId);
      focusTab(nextTabId);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextTabId = TABS[(index - 1 + TABS.length) % TABS.length].id;
      setActiveTab(nextTabId);
      focusTab(nextTabId);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const nextTabId = TABS[0].id;
      setActiveTab(nextTabId);
      focusTab(nextTabId);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const nextTabId = TABS[TABS.length - 1].id;
      setActiveTab(nextTabId);
      focusTab(nextTabId);
    }
  };

  const activeTabConfig = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const activeTabIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const ActiveTabComponent = activeTabConfig.component;

  return (
    <div style={styles.container} className="dashboard-shell dashboard-shell-refined">
      <div style={styles.header} className="dashboard-header">
        <div style={styles.headerCopy}>
          <div style={styles.logo}>EV Buddy</div>
          <div style={styles.subtitle}>Hypergrid API Command Console</div>
        </div>
        <div style={styles.headerBadge}>Live workspace</div>
      </div>

      <nav
        style={styles.tabs}
        className="dashboard-tabs"
        ref={tabsRef}
        role="tablist"
        aria-label="Dashboard sections"
      >
        <div className="dashboard-tab-groups" role="presentation">
          {tabsByGroup.map((group) => (
            <div key={group.id} className="dashboard-tab-group" role="presentation">
              <div className="dashboard-tab-group-label" role="presentation">
                {group.label}
              </div>

              <div className="dashboard-tab-group-items" role="presentation">
                {group.tabs.map((tab) => {
                  const index = TABS.findIndex((candidate) => candidate.id === tab.id);
                  const Icon = tab.icon;

                  return (
                    <TabButton
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      className={`dashboard-tab${activeTab === tab.id ? " is-active" : ""}`}
                      active={activeTab === tab.id}
                      style={styles.tab}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(event) => handleTabKeyDown(event, index)}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={activeTab === tab.id ? `panel-${tab.id}` : undefined}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      data-active={activeTab === tab.id ? "true" : "false"}
                    >
                      <span className="dashboard-tab-icon" aria-hidden>
                        <Icon size={14} strokeWidth={2.1} />
                      </span>
                      <span className="dashboard-tab-text">{tab.label}</span>
                    </TabButton>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-tab-track" aria-hidden>
          <span
            className="dashboard-tab-indicator"
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: indicator.width,
              opacity: indicator.visible ? 1 : 0,
            }}
          />
        </div>
      </nav>

      <section
        className="dashboard-tabpanel"
        role="tabpanel"
        id={`panel-${activeTabConfig.id}`}
        aria-labelledby={`tab-${activeTabConfig.id}`}
      >
        <div className="dashboard-viewing-meta" aria-live="polite">
          <span className="dashboard-viewing-label">Viewing</span>
          <span className="dashboard-viewing-value">{activeTabConfig.label}</span>
          <span className="dashboard-viewing-order">
            {activeTabIndex + 1} / {TABS.length}
          </span>
        </div>

        <ScreenContainer>
          <ActiveTabComponent />
        </ScreenContainer>
      </section>
    </div>
  );
}

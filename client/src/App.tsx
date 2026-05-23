import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./styles";
import {
  Activity,
  BatteryCharging,
  Building2,
  Clock3,
  FlaskConical,
  Inbox,
  MessagesSquare,
  Radio,
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
import DispatchTab from "./components/DispatchTab";
import { ScreenContainer, TabButton } from "./components/primitives";
import StarfieldCanvas from "./components/StarfieldCanvas";

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
    id: "dispatch",
    label: "Dispatch",
    group: "operations",
    icon: Radio,
    component: DispatchTab,
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

const scrollToSection = (tabId: string) => {
  const section = document.getElementById(`section-${tabId}`);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hashTabId = readHashTabId();
    return TAB_IDS.has(hashTabId) ? hashTabId : DEFAULT_TAB_ID;
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const tabsRef = useRef<HTMLElement | null>(null);
  // Ref to suppress observer-driven updates during programmatic scroll
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabsByGroup = useMemo(
    () =>
      TAB_GROUPS.map((group) => ({
        ...group,
        tabs: TABS.filter((tab) => tab.group === group.id),
      })).filter((group) => group.tabs.length > 0),
    [],
  );

  // Scroll to section on tab click (suppress observer for a moment)
  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId);
    isScrollingRef.current = true;
    scrollToSection(tabId);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  }, []);

  // IntersectionObserver to track which section is in view
  useEffect(() => {
    const sectionEls = TABS.map((tab) => document.getElementById(`section-${tab.id}`)).filter(
      Boolean,
    ) as HTMLElement[];

    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;

        // Find the most-visible section
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        }

        if (bestEntry) {
          const sectionId = bestEntry.target.id.replace("section-", "");
          if (TAB_IDS.has(sectionId)) {
            setActiveTab(sectionId);
          }
        }
      },
      {
        rootMargin: "-140px 0px -40% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    for (const el of sectionEls) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  // Handle the custom tab navigation event (from child components)
  useEffect(() => {
    const handleTabNavigation = (event: Event) => {
      const tabId = (event as CustomEvent<{ tabId?: string }>).detail?.tabId;
      if (!tabId || !TAB_IDS.has(tabId)) return;
      handleTabClick(tabId);
    };

    window.addEventListener(TAB_NAV_EVENT, handleTabNavigation);
    return () => {
      window.removeEventListener(TAB_NAV_EVENT, handleTabNavigation);
    };
  }, [handleTabClick]);

  // Hash → scroll on hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const hashTabId = readHashTabId();
      if (!TAB_IDS.has(hashTabId)) return;
      handleTabClick(hashTabId);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [handleTabClick]);

  // Sync activeTab → URL hash
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

  // On mount, scroll to hash section if present
  useEffect(() => {
    const hashTabId = readHashTabId();
    if (TAB_IDS.has(hashTabId) && hashTabId !== DEFAULT_TAB_ID) {
      // Slight delay to let sections render first
      requestAnimationFrame(() => {
        scrollToSection(hashTabId);
      });
    }
  }, []);

  // Tab indicator logic (unchanged)
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

  // Keyboard navigation
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
      handleTabClick(nextTabId);
      focusTab(nextTabId);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextTabId = TABS[(index - 1 + TABS.length) % TABS.length].id;
      handleTabClick(nextTabId);
      focusTab(nextTabId);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const nextTabId = TABS[0].id;
      handleTabClick(nextTabId);
      focusTab(nextTabId);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const nextTabId = TABS[TABS.length - 1].id;
      handleTabClick(nextTabId);
      focusTab(nextTabId);
    }
  };

  return (
    <>
      <StarfieldCanvas />
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
                      onClick={() => handleTabClick(tab.id)}
                      onKeyDown={(event) => handleTabKeyDown(event, index)}
                      role="tab"
                      aria-selected={activeTab === tab.id}
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

      <div className="dashboard-sections-wrap">
        {TABS.map((tab, index) => {
          const TabComponent = tab.component;
          const Icon = tab.icon;

          return (
            <section
              key={tab.id}
              id={`section-${tab.id}`}
              className="dashboard-section"
            >
              <div className="dashboard-section-header">
                <span className="dashboard-section-header-icon" aria-hidden>
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <span className="dashboard-section-header-title">{tab.label}</span>
                <span className="dashboard-section-header-order">
                  {index + 1} / {TABS.length}
                </span>
              </div>

              <ScreenContainer>
                <TabComponent />
              </ScreenContainer>
            </section>
          );
        })}
      </div>
      </div>
    </>
  );
}

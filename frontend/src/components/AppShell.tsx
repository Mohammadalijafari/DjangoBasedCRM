import { NavLink, Outlet } from "react-router-dom";
import styles from "./AppShell.module.css";
import { useAuth } from "../auth/AuthContext";

const NAV_ITEMS = [
  { to: "/deals", label: "Deals" },
  { to: "/contacts", label: "Contacts" },
  { to: "/companies", label: "Companies" },
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          Ledger
          <small>Sales register</small>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div>{user?.email}</div>
          <button type="button" className={styles.signOut} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <div className={styles.main}>
        <Outlet />
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className={styles.topbar}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <div className={styles.pageSubtitle}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

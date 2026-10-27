/** Human Assist — AppDashboard container.

Idle/empty state connected to the store: shows session count and
"New Task" (server-first create with offline queue fallback).
*/

import { Dashboard } from "../Dashboard";
import { useStore } from "../../store";

export interface AppDashboardProps {
  /** Render the dashboard (false → null). */
  active: boolean;
  onConnectMCP?: () => void;
}

export function AppDashboard({ active, onConnectMCP }: AppDashboardProps) {
  const sessions = useStore((s) => s.sessions);
  const setActiveSession = useStore((s) => s.setActiveSession);

  return (
    <Dashboard
      active={active}
      sessionCount={sessions.length}
      recentSessions={sessions.slice(0, 5).map((s) => ({
        id: s.id,
        title: s.title,
      }))}
      onSessionClick={(id) => setActiveSession(id)}
      onConnectMCP={onConnectMCP}
    />
  );
}

export default AppDashboard;

// app/dashboard/layout.tsx
import LayoutDashboard from "@/components/LayoutDashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Dashboard - FlowSend",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LayoutDashboard>{children}</LayoutDashboard>
    </Suspense>)
}

import { Shell } from "@/components/layout/Shell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <Shell area="client">{children}</Shell>;
}

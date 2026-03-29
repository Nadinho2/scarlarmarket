import { redirect } from "next/navigation";

// SCALAR: single list lives on `/`; keep `/markets` as a stable alias
export default function MarketsAliasPage() {
  redirect("/");
}

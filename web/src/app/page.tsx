import { redirect } from "next/navigation";

// Root "/" → redirect to dashboard (auth check is inside dashboard layout)
export default function Home() {
    redirect("/dashboard");
}
